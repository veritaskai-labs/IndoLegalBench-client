import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { createSnapshot, listSnapshots } from "@/lib/suites/snapshotApi";
import { session } from "@/test/authMock";
import { makeSnapshot, makeSnapshotPage, makeSnapshotSummary } from "@/test/snapshotFixtures";
import { SnapshotSection } from "./SnapshotSection";

// Who is signed in decides whether the button is offered.
vi.mock("@/hooks/useAuth", async () => await import("@/test/authMock"));

vi.mock("@/lib/suites/snapshotApi", () => ({
  createSnapshot: vi.fn(),
  listSnapshots: vi.fn(),
}));

const createMock = vi.mocked(createSnapshot);
const listMock = vi.mocked(listSnapshots);

const openDialog = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Buat snapshot" }));

/** The page button and the dialog button share a name, so confirm inside the dialog. */
const confirm = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Buat snapshot" }));

beforeEach(() => {
  session.role = "admin";
  createMock.mockReset();
  listMock.mockReset();
  listMock.mockResolvedValue(makeSnapshotPage([]));
});

describe("SnapshotSection", () => {
  // Positive: AC5, the admin gets the button.
  it("offers the admin a button that opens the confirmation", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SnapshotSection suiteId="suite-1" />);

    // Act
    await openDialog(user);

    // Assert
    expect(screen.getByRole("dialog", { name: "Buat snapshot" })).toBeInTheDocument();
  });

  it("closes the dialog and confirms once the snapshot is created", async () => {
    // Arrange
    const user = userEvent.setup();
    createMock.mockResolvedValue(makeSnapshot());
    render(<SnapshotSection suiteId="suite-1" />);
    await openDialog(user);

    // Act
    await confirm(user);

    // Assert
    expect(createMock).toHaveBeenCalledWith("suite-1");
    expect(await screen.findByRole("status")).toHaveTextContent("Snapshot berhasil dibuat.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the dialog without creating anything when cancelled", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<SnapshotSection suiteId="suite-1" />);
    await openDialog(user);

    // Act
    await user.click(screen.getByRole("button", { name: "Batal" }));

    // Assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // Negative: AC5, Viewer only looks.
  it.each(["author", "reviewer", "viewer"] as const)(
    "shows the list but no create button to the %s",
    async (role) => {
      // Arrange
      session.role = role;
      listMock.mockResolvedValue(makeSnapshotPage([makeSnapshotSummary()]));

      // Act
      render(<SnapshotSection suiteId="suite-1" />);

      // Assert
      expect(await screen.findByText("Snapshot 03 Okt 2026, 14.05 WIB")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Buat snapshot" })).not.toBeInTheDocument();
    },
  );

  // Edge: the session has not loaded yet.
  it("offers no create button while the session is loading", async () => {
    // Arrange
    session.role = null;

    // Act
    render(<SnapshotSection suiteId="suite-1" />);
    await screen.findByText("Belum ada snapshot");

    // Assert
    expect(screen.queryByRole("button", { name: "Buat snapshot" })).not.toBeInTheDocument();
  });

  // Edge: a second snapshot starts from a clean message.
  it("clears the success message when the dialog is opened again", async () => {
    // Arrange
    const user = userEvent.setup();
    createMock.mockResolvedValue(makeSnapshot());
    render(<SnapshotSection suiteId="suite-1" />);
    await openDialog(user);
    await confirm(user);
    await screen.findByRole("status");

    // Act
    await openDialog(user);

    // Assert
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // AC5: the list of snapshots.
  it("lists the snapshots of the suite, newest first as the server sends them", async () => {
    // Arrange
    listMock.mockResolvedValue(
      makeSnapshotPage([
        makeSnapshotSummary({ id: "s2", created_at: "2026-10-04T08:30:00Z" }),
        makeSnapshotSummary({ id: "s1", created_at: "2026-10-03T07:05:00Z" }),
      ]),
    );

    // Act
    render(<SnapshotSection suiteId="suite-1" />);
    await screen.findByText("Snapshot 04 Okt 2026, 15.30 WIB");

    // Assert
    expect(listMock).toHaveBeenCalledWith("suite-1", 1, 10);
    const rows = screen.getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("Snapshot 04 Okt 2026, 15.30 WIB");
    expect(rows[1]).toHaveTextContent("Snapshot 03 Okt 2026, 14.05 WIB");
  });

  it("shows the new snapshot in the list after one is created", async () => {
    // Arrange
    const user = userEvent.setup();
    listMock.mockResolvedValueOnce(makeSnapshotPage([]));
    listMock.mockResolvedValueOnce(
      makeSnapshotPage([makeSnapshotSummary({ created_at: "2026-10-05T01:00:00Z" })]),
    );
    createMock.mockResolvedValue(makeSnapshot());
    render(<SnapshotSection suiteId="suite-1" />);
    await screen.findByText("Belum ada snapshot");
    await openDialog(user);

    // Act
    await confirm(user);

    // Assert
    expect(await screen.findByText("Snapshot 05 Okt 2026, 08.00 WIB")).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  // Negative
  it("shows the error for the list and loads it again on retry", async () => {
    // Arrange
    const user = userEvent.setup();
    listMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR"));
    listMock.mockResolvedValueOnce(makeSnapshotPage([makeSnapshotSummary()]));
    render(<SnapshotSection suiteId="suite-1" />);
    await screen.findByRole("alert");

    // Act
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(await screen.findByText("Snapshot 03 Okt 2026, 14.05 WIB")).toBeInTheDocument();
  });
});
