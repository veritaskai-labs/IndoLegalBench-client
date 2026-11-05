import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { clearAcceptAsIs } from "@/lib/runs/sessionControlApi";
import { ClearAcceptAsIsDialog } from "./ClearAcceptAsIsDialog";

// sessionControlApi has its own request tests (stubbed fetch); here only the dialog's reaction matters.
vi.mock("@/lib/runs/sessionControlApi", () => ({ clearAcceptAsIs: vi.fn() }));

const clear = vi.mocked(clearAcceptAsIs);

const cleared = { id: "s-1", accepted_as_is_at: null, accepted_as_is_by: null, accepted_as_is_reason: null };

function renderDialog() {
  const onCleared = vi.fn();
  const onClose = vi.fn();
  render(<ClearAcceptAsIsDialog session={{ id: "s-1", label: "Run November" }} onCleared={onCleared} onClose={onClose} />);
  const dialog = within(screen.getByRole("dialog", { name: "Hapus tanda terima apa adanya?" }));
  return { dialog, onCleared, onClose };
}

beforeEach(() => {
  clear.mockReset();
});

describe("ClearAcceptAsIsDialog (PBI-12 AC9)", () => {
  it("says what removing the mark changes before doing it", () => {
    const { dialog } = renderDialog();

    expect(dialog.getByText(/“Run November” tidak lagi dianggap selesai sepenuhnya/)).toBeInTheDocument();
    expect(dialog.getByText(/bisa dicoba ulang lagi/)).toBeInTheDocument();
  });

  it("removes the mark and tells the page", async () => {
    const user = userEvent.setup();
    clear.mockResolvedValue(cleared);
    const { dialog, onCleared } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Hapus tanda" }));

    expect(clear).toHaveBeenCalledWith("s-1");
    await waitFor(() => expect(onCleared).toHaveBeenCalledWith(cleared));
  });

  // Negative: another Admin removed it first.
  it("shows why the server refused and reports the failure on close", async () => {
    const user = userEvent.setup();
    clear.mockRejectedValue(new ApiError(409, "NOT_ACCEPTED"));
    const { dialog, onCleared, onClose } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Hapus tanda" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent("Sesi ini belum diterima apa adanya. Muat ulang halaman.");
    expect(onCleared).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Tutup" }));
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it("sends nothing when the user cancels", async () => {
    const user = userEvent.setup();
    const { dialog, onClose } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Batal" }));

    expect(clear).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(false);
  });
});
