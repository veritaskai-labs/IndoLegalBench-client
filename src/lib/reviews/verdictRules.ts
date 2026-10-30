import type { Role } from "@/types";
import type {
  ReviewerSlot,
  RoundStatus,
  VerdictDecision,
  VerdictResult,
  VerdictView,
  VerdictWrite,
} from "@/types/review";

export type ReviewBlocker = "not_reviewer" | "is_author";

/** Satu-satunya tempat yang menentukan siapa yang menilai kasus: hanya Kontributor, dan bukan untuk kasus tulisannya sendiri (lihat reviewBlocker). null berarti belum ada sesi. */
export function isReviewerRole(role: Role | null): boolean {
  return role === "contributor";
}

/**
 * Kenapa pengguna tidak boleh menilai kasus ini, atau null bila boleh. Dicek di client karena setiap
 * 403 dari server memindahkan pengguna ke /forbidden, padahal alasannya layak dijelaskan di halaman.
 * Peran dicek lebih dulu: pesan "Anda penulisnya" tidak berarti bagi admin.
 */
export function reviewBlocker(user: { id: string; role: Role }, authorId: string): ReviewBlocker | null {
  if (!isReviewerRole(user.role)) return "not_reviewer";
  if (user.id === authorId) return "is_author";
  return null;
}

/** Komentar hanya wajib saat meminta revisi. Ini petunjuk tombol; server tetap yang memutuskan. */
export function canSubmitVerdict(decision: VerdictDecision | null, comment: string): boolean {
  if (decision === null) return false;
  return decision === "approve" || comment.trim() !== "";
}

/** Body POST verdict. Komentar di-trim dan yang kosong dikirim null, sama seperti yang disimpan server. */
export function buildVerdictBody(decision: VerdictDecision, comment: string): VerdictWrite {
  const trimmed = comment.trim();
  return { decision, comment: trimmed === "" ? null : trimmed };
}

/**
 * Penilaian reviewer lain masih disembunyikan: server mengirim null sampai round selesai, kecuali
 * untuk admin. Dibaca dari respons, bukan ditebak dari peran, jadi aturan buta tetap milik server.
 */
export function otherReviewerIsBlind(slot: Pick<ReviewerSlot, "verdict">, roundStatus: RoundStatus): boolean {
  return slot.verdict === null && roundStatus !== "decided";
}

/**
 * Penilaian yang ditampilkan di halaman. Balasan dari pengiriman lebih baru daripada antrean yang
 * dipakai membuka halaman, jadi didahulukan; selain itu penilaian yang sudah ada di antrean. Hanya
 * keputusan, komentar, dan waktu yang diambil: status round milik round, bukan milik penilaian.
 */
export function submittedVerdict(result: VerdictResult | null, fromQueue: VerdictView | null): VerdictView | null {
  if (result === null) return fromQueue;
  return { decision: result.decision, comment: result.comment, submitted_at: result.submitted_at };
}

/** Urutan penilaian untuk Author: yang meminta revisi dulu, lalu yang menyetujui, lalu yang belum ada penilaiannya. */
function attentionRank(slot: Pick<ReviewerSlot, "verdict">): number {
  if (slot.verdict === null) return 2;
  return slot.verdict.decision === "revise" ? 0 : 1;
}

/**
 * Peninjau yang meminta revisi didahulukan, karena itu yang harus ditindaklanjuti Author. Urutan dari
 * server dipertahankan di dalam tiap kelompok, dan daftar yang diberikan tidak diubah.
 */
export function revisionRequestsFirst<T extends Pick<ReviewerSlot, "verdict">>(slots: readonly T[]): T[] {
  return slots
    .map((slot, index) => ({ slot, index }))
    .sort((a, b) => attentionRank(a.slot) - attentionRank(b.slot) || a.index - b.index)
    .map(({ slot }) => slot);
}
