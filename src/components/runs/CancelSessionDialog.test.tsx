import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { cancelSession } from "@/lib/runs/sessionControlApi";
import { CancelSessionDialog } from "./CancelSessionDialog";

// sessionControlApi has its own request tests (stubbed fetch); here only the dialog's reaction matters.
vi.mock("@/lib/runs/sessionControlApi", () => ({ cancelSession: vi.fn() }));

const cancel = vi.mocked(cancelSession);

const stopped = { id: "s-1", status: "cancelled" as const, stopped_at: "2026-11-05T03:00:00Z", stop_reason: "user" as const };

function renderDialog() {
  const onCancelled = vi.fn();
  const onClose = vi.fn();
  render(
    <CancelSessionDialog
      session={{ id: "s-1", label: "Run November", progress: { completed: 240, total: 300, completed_cases: 80, total_cases: 100, percent_cases_complete: 80 } }}
      onCancelled={onCancelled}
      onClose={onClose}
    />,
  );
  const dialog = within(screen.getByRole("dialog", { name: "Batalkan sesi?" }));
  return { dialog, onCancelled, onClose };
}

beforeEach(() => {
  cancel.mockReset();
});

describe("CancelSessionDialog (PBI-12 AC7)", () => {
  // AC7 spells this sentence out word for word.
  it("asks with the AC7 sentence and the finished count", () => {
    const { dialog } = renderDialog();

    expect(
      dialog.getByText(
        "Hasil yang sudah selesai (240 dari 300) akan tersimpan, tetapi sesi ini tidak dapat dipakai untuk laporan sampai dilanjutkan dan selesai. Lanjutkan membatalkan?",
      ),
    ).toBeInTheDocument();
  });

  it("cancels the session and tells the page", async () => {
    const user = userEvent.setup();
    cancel.mockResolvedValue(stopped);
    const { dialog, onCancelled } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Batalkan sesi" }));

    expect(cancel).toHaveBeenCalledWith("s-1");
    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith(stopped));
  });

  // Negative: "Kembali", not "Batal", so the way out does not read like the action itself.
  it("goes back without cancelling", async () => {
    const user = userEvent.setup();
    const { dialog, onClose } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Kembali" }));

    expect(cancel).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(false);
  });

  // Negative: the session ended while the dialog was open.
  it("shows why the server refused", async () => {
    const user = userEvent.setup();
    cancel.mockRejectedValue(new ApiError(409, "INVALID_TRANSITION"));
    const { dialog } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Batalkan sesi" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent("Status sesi sudah berubah. Muat ulang halaman.");
  });
});
