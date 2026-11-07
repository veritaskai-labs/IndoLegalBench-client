import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { unarchiveSession } from "@/lib/runs/runsApi";
import type { SessionUnarchiveResponse } from "@/types/measurement";
import { UnarchiveSessionDialog } from "./UnarchiveSessionDialog";

vi.mock("@/lib/runs/runsApi", () => ({ unarchiveSession: vi.fn() }));

const unarchive = vi.mocked(unarchiveSession);
const receipt: SessionUnarchiveResponse = { id: "s-1", status: "finished" };
const SESSION = { id: "s-1", label: "Uji Coba DeepSeek" };

function renderDialog() {
  const onUnarchived = vi.fn();
  const onClose = vi.fn();
  render(<UnarchiveSessionDialog session={SESSION} onUnarchived={onUnarchived} onClose={onClose} />);
  return { onUnarchived, onClose };
}

beforeEach(() => {
  unarchive.mockReset();
});

describe("UnarchiveSessionDialog (PBI-11 AC10)", () => {
  it("asks first and says the status and data stay as they are", () => {
    // Arrange + Act
    renderDialog();

    // Assert
    const dialog = screen.getByRole("dialog", { name: "Kembalikan sesi?" });
    expect(dialog).toHaveTextContent("Sesi “Uji Coba DeepSeek” kembali ke daftar utama");
    expect(dialog).toHaveTextContent("status dan datanya tidak berubah");
    expect(unarchive).not.toHaveBeenCalled();
  });

  it("restores the session and reports it on confirm", async () => {
    // Arrange
    const user = userEvent.setup();
    unarchive.mockResolvedValue(receipt);
    const { onUnarchived } = renderDialog();

    // Act
    await user.click(screen.getByRole("button", { name: "Kembalikan" }));

    // Assert
    await waitFor(() => expect(onUnarchived).toHaveBeenCalledTimes(1));
    expect(unarchive).toHaveBeenCalledWith("s-1");
  });

  it("sends nothing when the user cancels", async () => {
    // Arrange
    const user = userEvent.setup();
    const { onClose, onUnarchived } = renderDialog();

    // Act
    await user.click(screen.getByRole("button", { name: "Batal" }));

    // Assert
    expect(unarchive).not.toHaveBeenCalled();
    expect(onUnarchived).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(false);
  });

  it("sends one request when Kembalikan is clicked twice", async () => {
    // Arrange
    const user = userEvent.setup();
    let finish: (value: SessionUnarchiveResponse) => void = () => undefined;
    unarchive.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    renderDialog();

    // Act
    await user.click(screen.getByRole("button", { name: "Kembalikan" }));
    await user.click(screen.getByRole("button", { name: "Mengembalikan…" }));

    // Assert
    expect(unarchive).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Mengembalikan…" })).toBeDisabled();
    await act(async () => finish(receipt));
  });

  it.each([
    [new ApiError(409, "SESSION_NOT_ARCHIVED"), "Sesi ini sudah dikembalikan. Muat ulang daftar."],
    [new ApiError(403, "NOT_YOUR_SESSION"), "Developer AI hanya bisa mengembalikan sesi yang ia buat."],
    [new TypeError("Failed to fetch"), "Sesi gagal dikembalikan. Coba lagi."],
  ])("shows why the server refused (%s) and tells the page to reload on close", async (error, message) => {
    // Arrange
    const user = userEvent.setup();
    unarchive.mockRejectedValue(error);
    const { onClose, onUnarchived } = renderDialog();

    // Act
    await user.click(screen.getByRole("button", { name: "Kembalikan" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    await user.click(screen.getByRole("button", { name: "Tutup" }));

    // Assert
    expect(onUnarchived).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(true);
  });
});
