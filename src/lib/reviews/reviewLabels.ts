import type { RoundDecision, VerdictDecision } from "@/types/review";
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
