import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import type { ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { ManualAnswerResponse, ManualAttemptSlot } from "@/types/measurement";
import { useManualAnswerDraft } from "./useManualAnswerDraft";

const NOW = new Date("2026-11-08T03:30:00Z");
const RESPONSE = { attempt_id: "att-1", session_status: "partially_filled" } as ManualAnswerResponse;

function slot(overrides: Partial<ManualAttemptSlot> = {}): ManualAttemptSlot {
  return {
    attempt_id: "att-1",
    repetition_no: 1,
    filled: false,
    answered_at_platform: null,
    source: "manual",
    platform_refused: false,
    evidence_count: 0,
    ...overrides,
  };
}

function fakeGateway(save: ManualAnswerGateway["saveAnswer"] = vi.fn().mockResolvedValue(RESPONSE)) {
  return { saveAnswer: save } as unknown as ManualAnswerGateway;
}

function setup(slotValue: ManualAttemptSlot, gateway: ManualAnswerGateway, onSaved = vi.fn()) {
  const view = renderHook(() =>
    useManualAnswerDraft({
      sessionId: "sesi-1",
      snapshotItemId: "snap-1",
      attemptNo: 1,
      slot: slotValue,
      gateway,
      onSaved,
      now: NOW,
    }),
  );
  return { ...view, onSaved };
}

describe("initial state", () => {
  // Positive: an unfilled slot starts empty with the time set to now (AC7).
  it("starts with an empty draft and the current time", () => {
    // Arrange
    const gateway = fakeGateway();

    // Act
    const { result } = setup(slot(), gateway);

    // Assert
    expect(result.current.draft).toEqual({
      answerMd: "",
      platformRefused: false,
      note: "",
      obtainedAt: "2026-11-08T10:30",
    });
    expect(result.current.dirty).toBe(false);
    expect(result.current.errors).toEqual({});
    expect(result.current.confirming).toBe(false);
  });

  // Positive: a saved slot starts with its saved text.
  it("starts with the saved answer", () => {
    // Arrange
    const saved = slot({ filled: true, answer_md: "Tersimpan", answered_at_platform: "2026-11-07T01:00:00Z" });

    // Act
    const { result } = setup(saved, fakeGateway());

    // Assert
    expect(result.current.draft.answerMd).toBe("Tersimpan");
    expect(result.current.draft.obtainedAt).toBe("2026-11-07T08:00");
  });
});

describe("editing", () => {
  // Positive: a change marks the draft dirty, the unsaved warning depends on it.
  it("is dirty after a change and clean after restoring the text", () => {
    // Arrange
    const { result } = setup(slot(), fakeGateway());

    // Act
    act(() => result.current.setField("answerMd", "Halo"));
    const dirtyAfterTyping = result.current.dirty;
    act(() => result.current.setField("answerMd", ""));

    // Assert
    expect(dirtyAfterTyping).toBe(true);
    expect(result.current.dirty).toBe(false);
  });
});

describe("save on an unfilled slot (AC4, AC6)", () => {
  // Positive: one PUT without confirm, then the baseline moves and the parent is told.
  it("sends the answer without confirm and reports the result", async () => {
    // Arrange
    const save = vi.fn().mockResolvedValue(RESPONSE);
    const { result, onSaved } = setup(slot(), fakeGateway(save));
    act(() => result.current.setField("answerMd", "Jawaban | tabel"));

    // Act
    await act(async () => result.current.save());

    // Assert
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("sesi-1", {
      snapshot_item_id: "snap-1",
      attempt_no: 1,
      answer_md: "Jawaban | tabel",
      obtained_at: "2026-11-08T03:30:00.000Z",
      platform_refused: false,
      note: null,
      confirm: false,
    });
    expect(onSaved).toHaveBeenCalledWith(RESPONSE);
    expect(result.current.dirty).toBe(false);
    expect(result.current.saveError).toBeNull();
  });

  // Negative: AC6 an empty answer never reaches the server.
  it("shows the error and does not call the server for an empty answer", async () => {
    // Arrange
    const save = vi.fn();
    const { result } = setup(slot(), fakeGateway(save));

    // Act
    await act(async () => result.current.save());

    // Assert
    expect(save).not.toHaveBeenCalled();
    expect(result.current.errors.answer).toContain("Jawaban tidak boleh kosong");
  });

  // Edge: errors stay hidden until the first try, then follow the edits.
  it("clears the error once the user fixes the field", async () => {
    // Arrange
    const { result } = setup(slot(), fakeGateway());
    await act(async () => result.current.save());

    // Act
    act(() => result.current.setField("answerMd", "Isi"));

    // Assert
    expect(result.current.errors).toEqual({});
  });

  // Positive: AC6 a refusal with a note is saved with an explicit null answer.
  it("saves a refusal with a note", async () => {
    // Arrange
    const save = vi.fn().mockResolvedValue(RESPONSE);
    const { result } = setup(slot(), fakeGateway(save));
    act(() => {
      result.current.setField("platformRefused", true);
      result.current.setField("note", "Platform menolak");
    });

    // Act
    await act(async () => result.current.save());

    // Assert
    expect(save.mock.calls[0][1]).toMatchObject({ answer_md: null, platform_refused: true, note: "Platform menolak" });
  });

  // Negative: a server failure keeps the text and shows a message.
  it("keeps the draft and shows the message when the server fails", async () => {
    // Arrange
    const save = vi.fn().mockRejectedValue(new ApiError(409, "MANUAL_SESSION_FINALIZED"));
    const { result, onSaved } = setup(slot(), fakeGateway(save));
    act(() => result.current.setField("answerMd", "Jawaban"));

    // Act
    await act(async () => result.current.save());

    // Assert
    expect(result.current.saveError).toBe("Sesi ini sudah ditandai selesai, jawaban tidak bisa diubah lagi.");
    expect(result.current.draft.answerMd).toBe("Jawaban");
    expect(result.current.dirty).toBe(true);
    expect(onSaved).not.toHaveBeenCalled();
  });

  // Edge: a network failure uses the save specific fallback.
  it("uses the fallback message for an unknown failure", async () => {
    // Arrange
    const save = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
    const { result } = setup(slot(), fakeGateway(save));
    act(() => result.current.setField("answerMd", "Jawaban"));

    // Act
    await act(async () => result.current.save());

    // Assert
    expect(result.current.saveError).toBe("Gagal menyimpan jawaban. Coba lagi.");
  });

  // Edge: a second click while the first is in flight is ignored.
  it("ignores a second save while one is in flight", async () => {
    // Arrange
    let finish: (value: ManualAnswerResponse) => void = () => undefined;
    const save = vi.fn().mockImplementation(() => new Promise<ManualAnswerResponse>((resolve) => (finish = resolve)));
    const { result } = setup(slot(), fakeGateway(save));
    act(() => result.current.setField("answerMd", "Jawaban"));

    // Act
    act(() => void result.current.save());
    const pendingWhileInFlight = result.current.saving;
    act(() => void result.current.save());
    await act(async () => finish(RESPONSE));

    // Assert
    expect(pendingWhileInFlight).toBe(true);
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.current.saving).toBe(false);
  });
});

describe("overwrite confirmation (AC5)", () => {
  const filledSlot = () => slot({ filled: true, answer_md: "Lama", answered_at_platform: "2026-11-07T01:00:00Z" });

  // Positive: an already filled slot asks before anything is sent.
  it("asks for confirmation first when the slot is already filled", async () => {
    // Arrange
    const save = vi.fn().mockResolvedValue(RESPONSE);
    const { result } = setup(filledSlot(), fakeGateway(save));
    act(() => result.current.setField("answerMd", "Baru"));

    // Act
    await act(async () => result.current.save());

    // Assert
    expect(result.current.confirming).toBe(true);
    expect(save).not.toHaveBeenCalled();
  });

  // Positive: after the user agrees, the request carries confirm=true.
  it("sends confirm=true after the user confirms", async () => {
    // Arrange
    const save = vi.fn().mockResolvedValue(RESPONSE);
    const { result, onSaved } = setup(filledSlot(), fakeGateway(save));
    act(() => result.current.setField("answerMd", "Baru"));
    await act(async () => result.current.save());

    // Act
    await act(async () => result.current.confirmOverwrite());

    // Assert
    expect(save.mock.calls[0][1]).toMatchObject({ answer_md: "Baru", confirm: true });
    expect(result.current.confirming).toBe(false);
    expect(onSaved).toHaveBeenCalledWith(RESPONSE);
  });

  // Negative: cancelling sends nothing and keeps what the user typed.
  it("keeps the draft and sends nothing when the user cancels", async () => {
    // Arrange
    const save = vi.fn();
    const { result } = setup(filledSlot(), fakeGateway(save));
    act(() => result.current.setField("answerMd", "Baru"));
    await act(async () => result.current.save());

    // Act
    act(() => result.current.cancelOverwrite());

    // Assert
    expect(result.current.confirming).toBe(false);
    expect(result.current.draft.answerMd).toBe("Baru");
    expect(save).not.toHaveBeenCalled();
  });

  // Edge: someone else filled the slot after this page loaded, so the server asks for confirmation.
  it("asks for confirmation when the server answers CONFIRMATION_REQUIRED", async () => {
    // Arrange
    const save = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(409, "CONFIRMATION_REQUIRED"))
      .mockResolvedValueOnce(RESPONSE);
    const { result } = setup(slot(), fakeGateway(save));
    act(() => result.current.setField("answerMd", "Baru"));
    await act(async () => result.current.save());
    const askedAfterConflict = result.current.confirming;

    // Act
    await act(async () => result.current.confirmOverwrite());

    // Assert
    expect(askedAfterConflict).toBe(true);
    expect(result.current.saveError).toBeNull();
    expect(save).toHaveBeenCalledTimes(2);
    expect(save.mock.calls[1][1]).toMatchObject({ confirm: true });
  });

  // Negative: a failure during the confirmed save closes the dialog and shows the error.
  it("shows the error and closes the dialog when the confirmed save fails", async () => {
    // Arrange
    const save = vi.fn().mockRejectedValue(new ApiError(409, "MANUAL_SESSION_FINALIZED"));
    const { result } = setup(filledSlot(), fakeGateway(save));
    act(() => result.current.setField("answerMd", "Baru"));
    await act(async () => result.current.save());

    // Act
    await act(async () => result.current.confirmOverwrite());

    // Assert
    expect(result.current.confirming).toBe(false);
    expect(result.current.saveError).toContain("sudah ditandai selesai");
  });
});
