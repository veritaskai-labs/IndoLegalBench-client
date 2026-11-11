import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import type { ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { ManualAnswerHistoryEntry } from "@/types/measurement";
import { AnswerHistoryDialog } from "./AnswerHistoryDialog";

function entry(overrides: Partial<ManualAnswerHistoryEntry> = {}): ManualAnswerHistoryEntry {
  return {
    id: "h-1",
    attempt_id: "att-1",
    answer_md: "**Jawaban lama**",
    filled_by: "u-1",
    filled_at: "2026-11-07T01:00:00Z",
    obtained_at: "2026-11-07T00:30:00Z",
    platform_refused: false,
    note: null,
    overwritten_by: "u-2",
    overwritten_at: "2026-11-07T03:00:00Z",
    ...overrides,
  };
}

function setup(getHistory: ManualAnswerGateway["getHistory"], onClose = vi.fn()) {
  render(
    <AnswerHistoryDialog
      gateway={{ getHistory } as unknown as ManualAnswerGateway}
      sessionId="sesi-1"
      snapshotItemId="snap-1"
      attemptNo={2}
      currentUserId="u-2"
      onClose={onClose}
    />,
  );
  return { onClose };
}

describe("AnswerHistoryDialog (AC5)", () => {
  // Positive: the title names the attempt and old answers are shown as formatted markdown.
  it("lists the earlier versions of the answer", async () => {
    // Arrange
    setup(vi.fn().mockResolvedValue([entry(), entry({ id: "h-2", answer_md: "Versi dua" })]));

    // Act
    const dialog = await screen.findByRole("dialog", { name: "Riwayat Percobaan 2" });

    // Assert
    expect(await screen.findByText("Versi 1")).toBeInTheDocument();
    expect(screen.getByText("Versi 2")).toBeInTheDocument();
    expect(screen.getByText("Jawaban lama")).toContainHTML("strong");
    expect(dialog).toBeInTheDocument();
  });

  // Positive: who filled, who overwrote, and the times in WIB.
  it("shows who filled and overwrote each version, with WIB times", async () => {
    // Arrange
    setup(vi.fn().mockResolvedValue([entry()]));

    // Act
    await screen.findByText("Versi 1");

    // Assert
    expect(screen.getByText(/Diisi oleh Anggota lain/)).toBeInTheDocument();
    expect(screen.getByText(/07 Nov 2026, 08\.00 WIB/)).toBeInTheDocument();
    expect(screen.getByText(/Ditimpa oleh Anda/)).toBeInTheDocument();
    expect(screen.getByText(/07 Nov 2026, 10\.00 WIB/)).toBeInTheDocument();
    expect(screen.getByText(/Diperoleh dari platform: 07 Nov 2026, 07\.30 WIB/)).toBeInTheDocument();
  });

  // Edge: an older refusal shows its note instead of an answer.
  it("shows the note of an earlier refusal", async () => {
    // Arrange
    setup(vi.fn().mockResolvedValue([entry({ answer_md: null, platform_refused: true, note: "Di luar cakupan" })]));

    // Act
    await screen.findByText("Versi 1");

    // Assert
    expect(screen.getByText("Platform menolak menjawab")).toBeInTheDocument();
    expect(screen.getByText("Catatan: Di luar cakupan")).toBeInTheDocument();
  });

  // Edge: the contract allows a null answer without a refusal; the dialog says it was empty.
  it("says the answer was empty when a version has no text and no refusal", async () => {
    // Arrange
    setup(vi.fn().mockResolvedValue([entry({ answer_md: null })]));

    // Act
    await screen.findByText("Versi 1");

    // Assert
    expect(screen.getByText("Jawaban kosong.")).toBeInTheDocument();
  });

  // Edge: a version with no platform time leaves that line out.
  it("leaves out the platform time line when it is missing", async () => {
    // Arrange
    setup(vi.fn().mockResolvedValue([entry({ obtained_at: null })]));

    // Act
    await screen.findByText("Versi 1");

    // Assert
    expect(screen.queryByText(/Diperoleh dari platform/)).not.toBeInTheDocument();
  });

  // Edge: an answer that was never overwritten has nothing to list.
  it("says so when the answer was never overwritten", async () => {
    // Arrange
    setup(vi.fn().mockResolvedValue([]));

    // Act
    const message = await screen.findByText("Jawaban ini belum pernah ditimpa, jadi belum ada versi sebelumnya.");

    // Assert
    expect(message).toBeInTheDocument();
  });

  // Edge: a loading state is visible first.
  it("shows a loading state first", async () => {
    // Arrange
    setup(vi.fn().mockReturnValue(new Promise(() => undefined)));

    // Act
    const loading = await screen.findByRole("status");

    // Assert
    expect(loading).toHaveTextContent("Memuat riwayat");
  });

  // Negative: a failure is shown with a retry.
  it("shows the error and loads again on retry", async () => {
    // Arrange
    const getHistory = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(404, "MANUAL_ANSWER_NOT_FOUND"))
      .mockResolvedValueOnce([entry()]);
    setup(getHistory);
    await screen.findByText("Jawaban manual tidak ditemukan.");

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(await screen.findByText("Versi 1")).toBeInTheDocument();
    expect(getHistory).toHaveBeenCalledTimes(2);
  });

  // Positive: closing reports to the parent, also with Escape.
  it("closes with the Tutup button", async () => {
    // Arrange
    const { onClose } = setup(vi.fn().mockResolvedValue([]));
    await screen.findByText(/belum pernah ditimpa/);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Tutup" }));

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes with Escape", async () => {
    // Arrange
    const { onClose } = setup(vi.fn().mockResolvedValue([]));
    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());

    // Act
    screen.getByRole("dialog").dispatchEvent(new Event("cancel", { cancelable: true }));

    // Assert
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
