import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { createSnapshot } from "@/lib/suites/snapshotApi";
import { makeSnapshot } from "@/test/snapshotFixtures";
import { CreateSnapshotDialog } from "./CreateSnapshotDialog";

vi.mock("@/lib/suites/snapshotApi", () => ({ createSnapshot: vi.fn() }));

const createMock = vi.mocked(createSnapshot);

beforeEach(() => {
  createMock.mockReset();
});

describe("CreateSnapshotDialog", () => {
  // Positive: AC5, a confirmation without a name field.
  it("asks for confirmation without asking for a name", () => {
    // Arrange / Act
    render(<CreateSnapshotDialog suiteId="suite-1" onClose={vi.fn()} onCreated={vi.fn()} />);

    // Assert
    expect(screen.getByRole("dialog", { name: "Buat snapshot" })).toHaveTextContent("waktu pembuatannya");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(createMock).not.toHaveBeenCalled();
  });

  it("creates the snapshot when confirmed and reports it", async () => {
    // Arrange
    const user = userEvent.setup();
    const onCreated = vi.fn();
    createMock.mockResolvedValue(makeSnapshot());
    render(<CreateSnapshotDialog suiteId="suite-1" onClose={vi.fn()} onCreated={onCreated} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Buat snapshot" }));

    // Assert
    expect(createMock).toHaveBeenCalledWith("suite-1");
    expect(onCreated).toHaveBeenCalledTimes(1);
  });

  it("closes without creating anything when cancelled", async () => {
    // Arrange
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CreateSnapshotDialog suiteId="suite-1" onClose={onClose} onCreated={vi.fn()} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Batal" }));

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(createMock).not.toHaveBeenCalled();
  });

  it("disables both buttons while the snapshot is being created", async () => {
    // Arrange
    const user = userEvent.setup();
    createMock.mockReturnValue(new Promise(() => undefined));
    render(<CreateSnapshotDialog suiteId="suite-1" onClose={vi.fn()} onCreated={vi.fn()} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Buat snapshot" }));

    // Assert
    expect(screen.getByRole("button", { name: "Membuat…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Batal" })).toBeDisabled();
  });

  // Negative
  it("stays open and explains an empty suite", async () => {
    // Arrange
    const user = userEvent.setup();
    const onCreated = vi.fn();
    createMock.mockRejectedValue(new ApiError(422, "NOTHING_TO_SNAPSHOT"));
    render(<CreateSnapshotDialog suiteId="suite-1" onClose={vi.fn()} onCreated={onCreated} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Buat snapshot" }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("belum punya kasus yang disetujui");
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Buat snapshot" })).toBeEnabled();
  });

  // Edge: the user can try again after a failure.
  it("lets the user try again after a failure", async () => {
    // Arrange
    const user = userEvent.setup();
    const onCreated = vi.fn();
    createMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL_ERROR"));
    createMock.mockResolvedValueOnce(makeSnapshot());
    render(<CreateSnapshotDialog suiteId="suite-1" onClose={vi.fn()} onCreated={onCreated} />);
    await user.click(screen.getByRole("button", { name: "Buat snapshot" }));
    await screen.findByRole("alert");

    // Act
    await user.click(screen.getByRole("button", { name: "Buat snapshot" }));

    // Assert
    expect(createMock).toHaveBeenCalledTimes(2);
    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
