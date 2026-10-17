import { apiFetch } from "@/lib/apiClient";
import {
  getCaseReview,
  listNeedsReassignment,
  replaceReviewer,
} from "./reviewApi";

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

const REVIEW: CaseReview = {
  case_id: "c1",
  case_version_id: "v1",
  round_no: 1,
  status: "open",
  decision: null,
  opened_at: "2026-10-16T03:00:00Z",
  decided_at: null,
  reviewers: [
    {
      assignment_id: "a1",
      reviewer: { id: "u1", name: "Roben" },
      status: "active",
      verdict: null,
    },
  ],
};


export function getCaseReview(caseId: string): Promise<CaseReview> {
  return apiFetch<CaseReview>(`/cases/${encodeURIComponent(caseId)}/review`);
}