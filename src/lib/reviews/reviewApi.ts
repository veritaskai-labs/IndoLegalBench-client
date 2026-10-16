import { apiFetch } from "@/lib/apiClient";
import type {
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