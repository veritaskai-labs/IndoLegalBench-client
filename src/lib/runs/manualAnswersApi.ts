import { apiFetch, apiFetchBlob, ApiError } from "@/lib/apiClient";
import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";
import { EVIDENCE_LIMIT_MESSAGE, type EvidenceInput } from "@/lib/runs/manualEvidenceRules";
import type {
  EvidenceRead,
  ManualAnswerHistoryEntry,
  ManualAnswerResponse,
  ManualAnswerSaveRequest,
} from "@/types/measurement";

/**
 * Semua pemanggilan server untuk kotak jawaban sesi manual. Hook bergantung pada antarmuka ini,
 * bukan pada fetch, jadi tes hook memakai gateway palsu tanpa jaringan.
 */
export interface ManualAnswerGateway {
  saveAnswer(sessionId: string, request: ManualAnswerSaveRequest): Promise<ManualAnswerResponse>;
  getHistory(sessionId: string, snapshotItemId: string, attemptNo: number): Promise<ManualAnswerHistoryEntry[]>;
  listEvidence(sessionId: string, snapshotItemId: string, attemptNo: number): Promise<EvidenceRead[]>;
  addEvidence(
    sessionId: string,
    snapshotItemId: string,
    attemptNo: number,
    input: EvidenceInput,
  ): Promise<EvidenceRead>;
  deleteEvidence(sessionId: string, evidenceId: string): Promise<void>;
  downloadEvidence(sessionId: string, evidenceId: string): Promise<Blob>;
}

const BASE = "/manual-measurements";

function sessionPath(sessionId: string): string {
  return `${BASE}/${encodeURIComponent(sessionId)}`;
}

function slotPath(sessionId: string, snapshotItemId: string, attemptNo: number): string {
  return `${sessionPath(sessionId)}/answers/${encodeURIComponent(snapshotItemId)}/${attemptNo}`;
}

function evidenceForm(input: EvidenceInput): FormData {
  const form = new FormData();
  if (input.kind === "file") form.append("file", input.file);
  else form.append("url", input.url.trim());
  return form;
}

/** Implementasi nyata di atas apiFetch (PUT/GET jawaban SCRUM-231, bukti SCRUM-233). */
export const manualAnswerGateway: ManualAnswerGateway = {
  saveAnswer: (sessionId, request) =>
    apiFetch<ManualAnswerResponse>(`${sessionPath(sessionId)}/answers`, {
      method: "PUT",
      body: JSON.stringify(request),
    }),
  getHistory: (sessionId, snapshotItemId, attemptNo) =>
    apiFetch<ManualAnswerHistoryEntry[]>(`${slotPath(sessionId, snapshotItemId, attemptNo)}/history`),
  listEvidence: (sessionId, snapshotItemId, attemptNo) =>
    apiFetch<EvidenceRead[]>(`${slotPath(sessionId, snapshotItemId, attemptNo)}/evidence`),
  addEvidence: (sessionId, snapshotItemId, attemptNo, input) =>
    apiFetch<EvidenceRead>(`${slotPath(sessionId, snapshotItemId, attemptNo)}/evidence`, {
      method: "POST",
      body: evidenceForm(input),
    }),
  deleteEvidence: (sessionId, evidenceId) =>
    apiFetch<void>(`${sessionPath(sessionId)}/evidence/${encodeURIComponent(evidenceId)}`, { method: "DELETE" }),
  downloadEvidence: (sessionId, evidenceId) =>
    apiFetchBlob(`${sessionPath(sessionId)}/evidence/${encodeURIComponent(evidenceId)}/file`),
};

/** Server minta konfirmasi sebelum menimpa jawaban yang sudah ada (AC5). */
export function isConfirmationRequired(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409 && error.code === "CONFIRMATION_REQUIRED";
}

const ERROR_MESSAGES = messages({
  id: {
    MANUAL_SESSION_NOT_FOUND: "Sesi pengukuran manual tidak ditemukan.",
    MANUAL_SESSION_FINALIZED: "Sesi ini sudah ditandai selesai, jawaban tidak bisa diubah lagi.",
    MANUAL_ANSWER_NOT_FOUND: "Jawaban manual tidak ditemukan.",
    EVIDENCE_LIMIT_REACHED: EVIDENCE_LIMIT_MESSAGE,
    EVIDENCE_TOO_LARGE: "Berkas bukti melebihi batas ukuran yang ditetapkan tim.",
    EVIDENCE_NOT_FOUND: "Bukti tidak ditemukan. Mungkin sudah dihapus.",
    FORBIDDEN: "Anda tidak memiliki akses untuk tindakan ini.",
    fallback: "Terjadi kesalahan. Coba lagi.",
  },
  en: {
    MANUAL_SESSION_NOT_FOUND: "Manual measurement session not found.",
    MANUAL_SESSION_FINALIZED: "This session is already marked finished, so the answer can no longer be changed.",
    MANUAL_ANSWER_NOT_FOUND: "Manual answer not found.",
    EVIDENCE_LIMIT_REACHED: `Evidence has reached the limit of 3 per answer. Delete one piece of evidence to add another.`,
    EVIDENCE_TOO_LARGE: "The evidence file is larger than the limit set by the team.",
    EVIDENCE_NOT_FOUND: "Evidence not found. It may already have been deleted.",
    FORBIDDEN: "You do not have access for this action.",
    fallback: "Something went wrong. Try again.",
  },
});

/** Pesan server dipakai dulu (sudah spesifik); kode dikenal memakai tabel; sisanya cadangan. */
export function answerErrorMessage(error: unknown, fallback?: string, locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(ERROR_MESSAGES, locale);
  const fallbackText = fallback ?? copy.fallback;
  if (error instanceof ApiError) {
    const known =
      error.code !== "fallback" && Object.hasOwn(copy, error.code) ? copy[error.code as keyof typeof copy] : undefined;
    return error.serverMessage ?? known ?? fallbackText;
  }
  return fallbackText;
}
