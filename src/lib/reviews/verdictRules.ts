import type { Role } from "@/types";
import type { ReviewerSlot, RoundStatus, VerdictDecision, VerdictWrite } from "@/types/review";

export type ReviewBlocker = "not_reviewer" | "is_author";

/**
 * Kenapa pengguna tidak boleh menilai kasus ini, atau null bila boleh. Dicek di client karena setiap
 * 403 dari server memindahkan pengguna ke /forbidden, padahal alasannya layak dijelaskan di halaman.
 * Peran dicek lebih dulu: pesan "Anda penulisnya" tidak berarti bagi admin.
 */
export function reviewBlocker(user: { id: string; role: Role }, authorId: string): ReviewBlocker | null {
  if (user.role !== "reviewer") return "not_reviewer";
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
