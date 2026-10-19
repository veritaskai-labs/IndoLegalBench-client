import type { RoundDecision, VerdictDecision } from "@/types/review";
import type { AssignmentStatus, RoundStatus, VerdictView } from "@/types/reviewAdmin";
import type { ReviewBlocker } from "./verdictRules";

/** Record, bukan string bebas: nilai baru di contract membuat tsc gagal sampai labelnya ditambah. */
export const VERDICT_LABEL: Record<VerdictDecision, string> = {
  approve: "Dapat dipertahankan sebagaimana tertulis",
  revise: "Perlu revisi",
};

export const VERDICT_HINT: Record<VerdictDecision, string> = {
  approve: "Saya bersedia mempertahankan referensi ini di depan advokat lain.",
  revise: "Mengirim kasus kembali ke penulis beserta komentar Anda.",
};

/** Urutan pilihan di form: setuju dulu, lalu revisi. */
export const VERDICT_ORDER: readonly VerdictDecision[] = ["approve", "revise"];

export const ROUND_OUTCOME_LABEL: Record<RoundDecision, string> = {
  approved: "Kasus disetujui",
  revise: "Kasus dikembalikan ke penulis untuk revisi",
};

/** Penjelasan untuk halaman bila pengguna tidak boleh menilai; server hanya akan menjawab 403 dan itu melempar ke /forbidden. */
export const BLOCKER_MESSAGE: Record<ReviewBlocker, string> = {
  not_reviewer: "Halaman ini untuk peninjau yang ditugaskan",
  is_author: "Anda tidak bisa meninjau kasus yang Anda tulis.",
};

/** Record<RoundStatus, string>: kalau server menambah status baru, tsc gagal sampai labelnya diisi. */
export const ROUND_STATUS_LABEL: Record<RoundStatus, string> = {
  awaiting_assignment: "Menunggu penugasan",
  open: "Sedang dinilai",
  decided: "Sudah diputuskan",
};

export const ASSIGNMENT_STATUS_LABEL: Record<AssignmentStatus, string> = {
  active: "Aktif",
  replaced: "Diganti",
  void: "Dibatalkan",
};

/** Versi pendek untuk tabel admin; VERDICT_LABEL yang panjang dipakai di form reviewer. */
export const VERDICT_DECISION_LABEL: Record<VerdictDecision, string> = {
  approve: "Setuju",
  revise: "Minta revisi",
};

export const ROUND_DECISION_LABEL: Record<RoundDecision, string> = {
  approved: "Disetujui",
  revise: "Perlu revisi",
};

/** AC3 meminta status penilaian sudah atau belum, jadi null pun punya kata-katanya sendiri. */
export function verdictLabel(
  verdict: VerdictView | null | undefined,
): string {
  return verdict ? VERDICT_DECISION_LABEL[verdict.decision] : "Belum menilai";
}
/** F-02: versi baru kasus yang sudah disetujui. Versi lama tetap berlaku sampai versi ini diputuskan. */
export function newVersionLabel(version: number | null): string | null {
  return version === null ? null : `Versi ${version} · versi yang disetujui tetap berlaku`;
}
