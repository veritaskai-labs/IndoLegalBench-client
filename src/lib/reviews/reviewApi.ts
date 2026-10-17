import { apiFetch } from "@/lib/apiClient";
import type {
  CaseReview,
  ReassignmentRow,
  ReplaceReviewerBody,
  ReplacedAssignment,
} from "@/types/reviewAdmin";

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

/** GET /cases/{case_id}/review. Admin melihat semua verdict kapan pun (keputusan klien SCRUM-145). */
export function getCaseReview(caseId: string): Promise<CaseReview> {
  return apiFetch<CaseReview>(`/cases/${encodeURIComponent(caseId)}/review`);
}