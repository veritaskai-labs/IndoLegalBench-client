import { apiFetch } from "@/lib/apiClient";
import type { AssignedReview, CaseReview, VerdictResult, VerdictWrite } from "@/types/review";

/** GET /reviews/assigned. Penugasan aktif reviewer yang login di round yang masih terbuka. Hanya reviewer. */
export function listAssignedReviews(): Promise<AssignedReview[]> {
  return apiFetch<AssignedReview[]>("/reviews/assigned");
}

/** POST /reviews/{assignment_id}/verdict. Komentar wajib bila decision = revise (422 COMMENT_REQUIRED). */
export function submitVerdict(assignmentId: string, verdict: VerdictWrite): Promise<VerdictResult> {
  return apiFetch<VerdictResult>(`/reviews/${encodeURIComponent(assignmentId)}/verdict`, {
    method: "POST",
    body: JSON.stringify(verdict),
  });
}

/**
 * GET /cases/{case_id}/review. Round terakhir kasus. Penilaian reviewer lain bernilai null sampai
 * round selesai, kecuali untuk admin. Hanya admin, penulis kasus, atau reviewer yang pernah ditugaskan;
 * selain itu server menjawab 403.
 */
export function getCaseReview(caseId: string): Promise<CaseReview> {
  return apiFetch<CaseReview>(`/cases/${encodeURIComponent(caseId)}/review`);
}
