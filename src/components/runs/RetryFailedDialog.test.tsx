import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { retrySession } from "@/lib/runs/sessionControlApi";
import { RetryFailedDialog } from "./RetryFailedDialog";

// sessionControlApi has its own request tests (stubbed fetch); here only the dialog's reaction matters.
vi.mock("@/lib/runs/sessionControlApi", () => ({ retrySession: vi.fn() }));

const retry = vi.mocked(retrySession);

const failed = [
  { key: "1", label: "QA-1 · Kasus sintetis 1", attemptIds: ["1-a2"] },
  { key: "3", label: "QA-3 · Kasus sintetis 3", attemptIds: ["3-a1", "3-a2"] },
];

const retried = { id: "s-1", status: "running" as const, retried_attempt_ids: ["1-a2", "3-a1", "3-a2"] };

function renderDialog() {
  const onRetried = vi.fn();
  const onClose = vi.fn();
  render(<RetryFailedDialog session={{ id: "s-1", label: "Run November" }} failed={failed} onRetried={onRetried} onClose={onClose} />);
  const dialog = within(screen.getByRole("dialog", { name: "Coba ulang yang gagal?" }));
  return { dialog, onRetried, onClose };
}

beforeEach(() => {
  retry.mockReset();
});

describe("RetryFailedDialog (PBI-12 AC3: per case or all)", () => {
  it("says what a retry changes and lists every failed case with its count", () => {
    const { dialog } = renderDialog();

    expect(dialog.getByText(/Jawaban yang sudah berhasil tidak diubah/)).toBeInTheDocument();
    expect(dialog.getByRole("checkbox", { name: "QA-1 · Kasus sintetis 1 (1 gagal)" })).toBeInTheDocument();
    expect(dialog.getByRole("checkbox", { name: "QA-3 · Kasus sintetis 3 (2 gagal)" })).toBeInTheDocument();
  });

  // Default: every failed case is ticked, so "semua" is one click away.
  it("retries every failed attempt when nothing is unticked", async () => {
    const user = userEvent.setup();
    retry.mockResolvedValue(retried);
    const { dialog, onRetried } = renderDialog();

    expect(dialog.getByRole("checkbox", { name: "Semua yang gagal (2 kasus)" })).toBeChecked();
    await user.click(dialog.getByRole("button", { name: "Coba ulang" }));

    expect(retry).toHaveBeenCalledWith("s-1", { allFailed: true });
    await waitFor(() => expect(onRetried).toHaveBeenCalledWith(retried));
  });

  it("retries only the failed attempts of the cases still ticked", async () => {
    const user = userEvent.setup();
    retry.mockResolvedValue({ ...retried, retried_attempt_ids: ["3-a1", "3-a2"] });
    const { dialog } = renderDialog();

    await user.click(dialog.getByRole("checkbox", { name: "QA-1 · Kasus sintetis 1 (1 gagal)" }));
    expect(dialog.getByRole("checkbox", { name: "Semua yang gagal (2 kasus)" })).not.toBeChecked();
    await user.click(dialog.getByRole("button", { name: "Coba ulang" }));

    expect(retry).toHaveBeenCalledWith("s-1", { attemptIds: ["3-a1", "3-a2"] });
  });

  it("ticks a case again after it was unticked", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDialog();
    const first = dialog.getByRole("checkbox", { name: "QA-1 · Kasus sintetis 1 (1 gagal)" });

    await user.click(first);
    await user.click(first);

    expect(first).toBeChecked();
    expect(dialog.getByRole("checkbox", { name: "Semua yang gagal (2 kasus)" })).toBeChecked();
  });

  // Edge: nothing ticked, nothing to retry.
  it("keeps the button off once every case is unticked, and ticks them all again", async () => {
    const user = userEvent.setup();
    const { dialog } = renderDialog();
    const all = dialog.getByRole("checkbox", { name: "Semua yang gagal (2 kasus)" });

    await user.click(all);
    expect(dialog.getByRole("button", { name: "Coba ulang" })).toBeDisabled();
    await user.click(all);
    expect(dialog.getByRole("checkbox", { name: "QA-1 · Kasus sintetis 1 (1 gagal)" })).toBeChecked();
    expect(dialog.getByRole("button", { name: "Coba ulang" })).toBeEnabled();
  });

  // Negative: another automatic session started in the meantime.
  it("shows why the server refused", async () => {
    const user = userEvent.setup();
    retry.mockRejectedValue(new ApiError(409, "ANOTHER_SESSION_RUNNING"));
    const { dialog } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Coba ulang" }));

    expect(await dialog.findByRole("alert")).toHaveTextContent(
      "Masih ada sesi otomatis lain yang berjalan. Lanjutkan setelah sesi itu selesai.",
    );
  });

  it("sends nothing when the user cancels", async () => {
    const user = userEvent.setup();
    const { dialog, onClose } = renderDialog();

    await user.click(dialog.getByRole("button", { name: "Batal" }));

    expect(retry).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledWith(false);
  });
});
