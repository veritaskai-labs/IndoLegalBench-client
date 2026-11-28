import { DEFAULT_LOCALE, fill, messages, text, type Locale } from "@/lib/i18n/locale";
import type { RoundDecision, VerdictDecision } from "@/types/review";
import type { AssignmentStatus, RoundStatus, VerdictView } from "@/types/reviewAdmin";
import type { ReviewBlocker } from "./verdictRules";

const VERDICT_FORM = messages({
  id: {
    approve: "Dapat dipertahankan sebagaimana tertulis",
    revise: "Perlu revisi",
  },
  en: {
    approve: "Defensible as written",
    revise: "Needs revision",
  },
});

const VERDICT_HINTS = messages({
  id: {
    approve: "Saya bersedia mempertahankan referensi ini di depan advokat lain.",
    revise: "Mengirim kasus kembali ke penulis beserta komentar Anda.",
  },
  en: {
    approve: "I am willing to defend this reference before other advocates.",
    revise: "Sends the case back to the author with your comment.",
  },
});

const ROUND_OUTCOMES = messages({
  id: {
    approved: "Kasus disetujui",
    revise: "Kasus dikembalikan ke penulis untuk revisi",
  },
  en: {
    approved: "Case approved",
    revise: "Case returned to the author for revision",
  },
});

const BLOCKERS = messages({
  id: {
    not_reviewer: "Halaman ini untuk peninjau yang ditugaskan",
    is_author: "Anda tidak bisa meninjau kasus yang Anda tulis.",
  },
  en: {
    not_reviewer: "This page is for the assigned reviewer",
    is_author: "You cannot review a case you wrote.",
  },
});

const ROUND_STATUSES = messages({
  id: {
    awaiting_assignment: "Menunggu penugasan",
    open: "Sedang dinilai",
    decided: "Sudah diputuskan",
  },
  en: {
    awaiting_assignment: "Awaiting assignment",
    open: "Under review",
    decided: "Decided",
  },
});

const ASSIGNMENT_STATUSES = messages({
  id: {
    active: "Aktif",
    replaced: "Diganti",
    void: "Dibatalkan",
  },
  en: {
    active: "Active",
    replaced: "Replaced",
    void: "Voided",
  },
});

const VERDICT_DECISIONS = messages({
  id: {
    approve: "Setuju",
    revise: "Minta revisi",
  },
  en: {
    approve: "Approve",
    revise: "Request revision",
  },
});

const ROUND_DECISIONS = messages({
  id: {
    approved: "Disetujui",
    revise: "Perlu revisi",
  },
  en: {
    approved: "Approved",
    revise: "Needs revision",
  },
});

const NOT_YET_REVIEWED = messages({
  id: "Belum menilai",
  en: "Not yet reviewed",
});

const NEW_VERSION = messages({
  id: "Versi {version} · versi yang disetujui tetap berlaku",
  en: "Version {version} · the approved version still applies",
});

/** Record, bukan string bebas: nilai baru di contract membuat tsc gagal sampai labelnya ditambah. */
export const VERDICT_LABEL: Record<VerdictDecision, string> = VERDICT_FORM.id;

export const VERDICT_HINT: Record<VerdictDecision, string> = VERDICT_HINTS.id;

/** Urutan pilihan di form: setuju dulu, lalu revisi. */
export const VERDICT_ORDER: readonly VerdictDecision[] = ["approve", "revise"];

export const ROUND_OUTCOME_LABEL: Record<RoundDecision, string> = ROUND_OUTCOMES.id;

/** Penjelasan untuk halaman bila pengguna tidak boleh menilai; server hanya akan menjawab 403 dan itu melempar ke /forbidden. */
export const BLOCKER_MESSAGE: Record<ReviewBlocker, string> = BLOCKERS.id;

/** Record<RoundStatus, string>: kalau server menambah status baru, tsc gagal sampai labelnya diisi. */
export const ROUND_STATUS_LABEL: Record<RoundStatus, string> = ROUND_STATUSES.id;

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = ASSIGNMENT_STATUSES.id;

/** Versi pendek untuk tabel admin; VERDICT_LABEL yang panjang dipakai di form reviewer. */
export const VERDICT_DECISION_LABEL: Record<VerdictDecision, string> = VERDICT_DECISIONS.id;

export const ROUND_DECISION_LABEL: Record<RoundDecision, string> = ROUND_DECISIONS.id;

export function verdictFormLabel(decision: VerdictDecision, locale: Locale = DEFAULT_LOCALE): string {
  return text(VERDICT_FORM, locale)[decision];
}

export function verdictHint(decision: VerdictDecision, locale: Locale = DEFAULT_LOCALE): string {
  return text(VERDICT_HINTS, locale)[decision];
}

export function roundOutcomeLabel(decision: RoundDecision, locale: Locale = DEFAULT_LOCALE): string {
  return text(ROUND_OUTCOMES, locale)[decision];
}

export function blockerMessage(blocker: ReviewBlocker, locale: Locale = DEFAULT_LOCALE): string {
  return text(BLOCKERS, locale)[blocker];
}

export function roundStatusLabel(status: RoundStatus, locale: Locale = DEFAULT_LOCALE): string {
  return text(ROUND_STATUSES, locale)[status];
}

export function assignmentStatusLabel(status: AssignmentStatus, locale: Locale = DEFAULT_LOCALE): string {
  return text(ASSIGNMENT_STATUSES, locale)[status];
}

export function verdictDecisionLabel(decision: VerdictDecision, locale: Locale = DEFAULT_LOCALE): string {
  return text(VERDICT_DECISIONS, locale)[decision];
}

export function roundDecisionLabel(decision: RoundDecision, locale: Locale = DEFAULT_LOCALE): string {
  return text(ROUND_DECISIONS, locale)[decision];
}

/** AC3 meminta status penilaian sudah atau belum, jadi null pun punya kata-katanya sendiri. */
export function verdictLabel(
  verdict: VerdictView | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): string {
  return verdict ? verdictDecisionLabel(verdict.decision, locale) : text(NOT_YET_REVIEWED, locale);
}

/** F-02: versi baru kasus yang sudah disetujui. Versi lama tetap berlaku sampai versi ini diputuskan. */
export function newVersionLabel(version: number | null, locale: Locale = DEFAULT_LOCALE): string | null {
  return version === null ? null : fill(text(NEW_VERSION, locale), { version });
}
