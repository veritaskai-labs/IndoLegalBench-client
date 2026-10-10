import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSnapshot } from "@/lib/suites/snapshotApi";
import { session } from "@/test/authMock";
import { makeSnapshot } from "@/test/snapshotFixtures";
import { SnapshotSection } from "./SnapshotSection";

// Who is signed in decides whether the button is offered.
vi.mock("@/hooks/useAuth", async () => await import("@/test/authMock"));

vi.mock("@/lib/suites/snapshotApi", () => ({ createSnapshot: vi.fn() }));

const createMock = vi.mocked(createSnapshot);

const openDialog = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(screen.getByRole("button", { name: "Buat snapshot" }));

/** The page button and the dialog button share a name, so confirm inside the dialog. */
const confirm = (user: ReturnType<typeof userEvent.setup>) =>
  user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Buat snapshot" }));

beforeEach(() => {
  session.role = "admin";
  createMock.mockReset();
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
  it.each(["author", "reviewer", "viewer"] as const)("shows nothing to create for the %s", (role) => {
    // Arrange
    session.role = role;

    // Act
    render(<SnapshotSection suiteId="suite-1" />);

    // Assert
    expect(screen.queryByRole("button", { name: "Buat snapshot" })).not.toBeInTheDocument();
  });

  // Edge: the session has not loaded yet.
  it("shows nothing while the session is loading", () => {
    // Arrange
    session.role = null;

    // Act
    render(<SnapshotSection suiteId="suite-1" />);

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
});
