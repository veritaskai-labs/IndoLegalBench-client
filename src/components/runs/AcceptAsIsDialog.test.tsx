import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { acceptAsIs } from "@/lib/runs/sessionControlApi";
import { AcceptAsIsDialog } from "./AcceptAsIsDialog";

// sessionControlApi has its own request tests (stubbed fetch); here only the dialog's reaction matters.
vi.mock("@/lib/runs/sessionControlApi", () => ({ acceptAsIs: vi.fn() }));

const accept = vi.mocked(acceptAsIs);

const accepted = {
  id: "s-1",
  accepted_as_is_at: "2026-11-05T03:00:00Z",
  accepted_as_is_by: "admin-1",
  accepted_as_is_reason: "Kegagalan dari batas kuota penyedia",
};

function renderDialog() {
  const onAccepted = vi.fn();
  const onClose = vi.fn();
  render(<AcceptAsIsDialog session={{ id: "s-1", label: "Run November" }} onAccepted={onAccepted} onClose={onClose} />);
  const dialog = within(screen.getByRole("dialog", { name: "Terima sesi apa adanya?" }));
  return { dialog, onAccepted, onClose };
}

beforeEach(() => {
  accept.mockReset();
});

describe("AcceptAsIsDialog (PBI-12 AC9: a written reason is required)", () => {
  it("says what accepting means before asking for a reason", () => {
    const { dialog } = renderDialog();

    expect(dialog.getByText(/“Run November” dianggap selesai sepenuhnya/)).toBeInTheDocument();
    expect(dialog.getByText(/tidak bisa dicoba ulang/)).toBeInTheDocument();
    expect(dialog.getByRole("textbox", { name: "Alasan" })).toBeRequired();
  });

  it("sends the reason and hands the accept record to the page", async () => {
    const user = userEvent.setup();
    accept.mockResolvedValue(accepted);
    const { dialog, onAccepted } = renderDialog();

    await user.type(dialog.getByRole("textbox", { name: "Alasan" }), "Kegagalan dari batas kuota penyedia");
    await user.click(dialog.getByRole("button", { name: "Terima apa adanya" }));

    expect(accept).toHaveBeenCalledWith("s-1", "Kegagalan dari batas kuota penyedia");
    await waitFor(() => expect(onAccepted).toHaveBeenCalledWith(accepted));
  });

  // Negative / boundary: the button stays off until something readable is written.
  it("keeps the button off for an empty or blank reason", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDialog();
    const confirm = dialog.getByRole("button", { name: "Terima apa adanya" });

    expect(confirm).toBeDisabled();
    await user.type(dialog.getByRole("textbox", { name: "Alasan" }), "   ");
    expect(confirm).toBeDisabled();
    await user.type(dialog.getByRole("textbox", { name: "Alasan" }), "x");
    expect(confirm).toBeEnabled();
  });

  // Negative: someone else accepted it first; the reason stays and closing asks for a reload.
  it("shows why the server refused and reports the failure on close", async () => {
    const user = userEvent.setup();
    accept.mockRejectedValue(new ApiError(409, "ALREADY_ACCEPTED"));
    const { dialog, onAccepted, onClose } = renderDialog();

    await user.type(dialog.getByRole("textbox", { name: "Alasan" }), "Alasan");
    await user.click(dialog.getByRole("button", { name: "Terima apa adanya" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent("Sesi ini sudah diterima apa adanya. Muat ulang halaman.");
    expect(onAccepted).not.toHaveBeenCalled();
    await user.click(dialog.getByRole("button", { name: "Tutup" }));
    expect(onClose).toHaveBeenCalledWith(true);
  });

  it("sends nothing when the user cancels", async () => {
    const user = userEvent.setup();
    const { dialog, onClose } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Batal" }));

    expect(accept).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(false);
  });
});
