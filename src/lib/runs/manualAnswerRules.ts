import { isoToWibInput, nowWibInput, wibInputToIso } from "@/lib/datetime/wibInput";
import type { Role } from "@/lib/auth";
import type { ManualAnswerSaveRequest, ManualAttemptSlot, SessionStatus } from "@/types/measurement";

/** Isian satu kotak jawaban. Waktu disimpan sebagai nilai kolom tanggal-jam dalam WIB. */
export type AnswerDraft = {
  answerMd: string;
  platformRefused: boolean;
  note: string;
  obtainedAt: string;
};

export type DraftErrors = Partial<Record<"answer" | "note" | "obtainedAt", string>>;

export const ANSWER_EMPTY_MESSAGE =
  'Jawaban tidak boleh kosong. Tempel jawaban platform, atau pilih "Platform menolak menjawab".';
export const NOTE_REQUIRED_MESSAGE = "Catatan wajib diisi bila platform menolak menjawab.";
export const OBTAINED_AT_INVALID_MESSAGE = "Tanggal dan jam jawaban diperoleh tidak valid.";

export function emptyDraft(now?: Date): AnswerDraft {
  return { answerMd: "", platformRefused: false, note: "", obtainedAt: nowWibInput(now) };
}

/** Isi kotak dari jawaban tersimpan; slot kosong memakai isian awal (waktu sekarang). */
export function draftFromSlot(slot: ManualAttemptSlot, now?: Date): AnswerDraft {
  if (!slot.filled) return emptyDraft(now);

  const obtainedAt = slot.answered_at_platform ? isoToWibInput(slot.answered_at_platform) : "";
  return {
    answerMd: slot.answer_md ?? "",
    platformRefused: slot.platform_refused,
    note: slot.note ?? "",
    obtainedAt: obtainedAt || nowWibInput(now),
  };
}

/**
 * Aturan AC6 dan AC7: jawaban tidak boleh kosong kecuali platform menolak menjawab, dan penolakan
 * wajib bercatatan. Teks jawaban hanya diperiksa, tidak diubah (AC4).
 */
export function validateDraft(draft: AnswerDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (draft.platformRefused) {
    if (draft.note.trim() === "") errors.note = NOTE_REQUIRED_MESSAGE;
  } else if (draft.answerMd.trim() === "") {
    errors.answer = ANSWER_EMPTY_MESSAGE;
  }
  if (wibInputToIso(draft.obtainedAt) === null) errors.obtainedAt = OBTAINED_AT_INVALID_MESSAGE;
  return errors;
}

/**
 * Bentuk badan PUT /manual-measurements/{id}/answers. Jawaban dikirim apa adanya tanpa trim (AC4);
 * penolakan mengirim answer_md null, dan catatan lama dibuang bila platform ternyata menjawab.
 * Mengembalikan null untuk isian yang tidak lolos validateDraft.
 */
export function buildSaveRequest(
  draft: AnswerDraft,
  snapshotItemId: string,
  attemptNo: number,
  confirm: boolean,
): ManualAnswerSaveRequest | null {
  const obtainedAt = wibInputToIso(draft.obtainedAt);
  if (obtainedAt === null || Object.keys(validateDraft(draft)).length > 0) return null;

  return {
    snapshot_item_id: snapshotItemId,
    attempt_no: attemptNo,
    answer_md: draft.platformRefused ? null : draft.answerMd,
    obtained_at: obtainedAt,
    platform_refused: draft.platformRefused,
    note: draft.platformRefused ? draft.note.trim() : null,
    confirm,
  };
}

export function isDirty(draft: AnswerDraft, baseline: AnswerDraft): boolean {
  return (
    draft.answerMd !== baseline.answerMd ||
    draft.platformRefused !== baseline.platformRefused ||
    draft.note !== baseline.note ||
    draft.obtainedAt !== baseline.obtainedAt
  );
}

/**
 * Admin dan Kontributor mengisi; Viewer tidak. Sesi Selesai tidak bisa dibuka kembali (AC8),
 * jadi kotaknya hanya terbaca. Server memeriksa lagi dengan 403 dan 409 MANUAL_SESSION_FINALIZED.
 */
export function canEditAnswers(role: Role | null, status: SessionStatus): boolean {
  return (role === "admin" || role === "contributor") && status !== "finalized";
}
