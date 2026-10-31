import { ApiError, apiFetch } from "@/lib/apiClient";
import type { AssignedReview, AwaitingRevisionReview, CaseReview, VerdictResult, VerdictWrite } from "@/types/review";
import type { ReassignmentRow, ReplaceReviewerBody, ReplacedAssignment } from "@/types/reviewAdmin";

/** GET /reviews/assigned. Penugasan aktif reviewer yang login di round yang masih terbuka. Hanya reviewer. */
export function listAssignedReviews(): Promise<AssignedReview[]> {
  return apiFetch<AssignedReview[]>("/reviews/assigned");
}

/**
 * GET /reviews/awaiting-revision. Kasus yang sudah dinilai reviewer yang login dan menunggu revisi Author.
 * Hanya reviewer. Kasus keluar dari daftar saat disetujui atau diajukan ulang; server yang memutuskan.
 */
export function listAwaitingRevision(): Promise<AwaitingRevisionReview[]> {
  return apiFetch<AwaitingRevisionReview[]>("/reviews/awaiting-revision");
}

/** POST /reviews/{assignment_id}/verdict. Komentar wajib bila decision = revise (422 COMMENT_REQUIRED). */
export function submitVerdict(assignmentId: string, verdict: VerdictWrite): Promise<VerdictResult> {
  return apiFetch<VerdictResult>(`/reviews/${encodeURIComponent(assignmentId)}/verdict`, {
    method: "POST",
    body: JSON.stringify(verdict),
  });
}

/** GET /reviews/needs-reassignment. Admin saja. Ronde tanpa reviewer aktif, server yang hitung. */
export function listNeedsReassignment(): Promise<ReassignmentRow[]> {
  return apiFetch<ReassignmentRow[]>("/reviews/needs-reassignment");
}

/** POST /reviews/{assignment_id}/replace. Admin saja, alasan wajib. */
export function replaceReviewer(
  assignmentId: string,
  body: ReplaceReviewerBody,
): Promise<ReplacedAssignment> {
  return apiFetch<ReplacedAssignment>(
    `/reviews/${encodeURIComponent(assignmentId)}/replace`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

/**
 * GET /cases/{case_id}/review. Round terakhir kasus. Penilaian reviewer lain bernilai null sampai
 * round selesai, kecuali untuk admin. Hanya admin, penulis kasus, atau reviewer yang pernah ditugaskan;
 * selain itu server menjawab 403.
 */
export function getCaseReview(caseId: string): Promise<CaseReview> {
  return apiFetch<CaseReview>(`/cases/${encodeURIComponent(caseId)}/review`);
}

/**
 * Seperti getCaseReview, tetapi untuk halaman yang menawarkan catatan peninjau ke semua Kontributor.
 * Hanya penulis dan reviewer yang ditugaskan yang boleh membacanya, dan klien tidak tahu siapa yang
 * ditugaskan. 403 (bukan pihak di kasus ini, tanpa dialihkan ke /forbidden) dan 404 NO_REVIEW_ROUND
 * (belum pernah diajukan) berarti tidak ada yang ditampilkan; kegagalan lain tetap dilempar.
 */
export async function findCaseReview(caseId: string): Promise<CaseReview | null> {
  try {
    return await apiFetch<CaseReview>(`/cases/${encodeURIComponent(caseId)}/review`, { silentForbidden: true });
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.code === "NO_REVIEW_ROUND")) return null;
    throw error;
  }
}
