/**
 * Bentuk dari SCRUM-147 (app/modules/reviews/schemas.py). Ditulis tangan dulu
 * karena PR-nya belum merge, jadi belum ada di contract/openapi.json.
 * Setelah SCRUM-147 masuk staging, ReassignmentRow diganti jadi
 * components["schemas"]["NeedsReassignmentResponse"] dan sisanya ikut.
 */

export type AssignmentStatus = "active" | "replaced" | "void";

export type RoundStatus = "awaiting_assignment" | "open" | "decided";

export type ReassignmentAssignment = {
  id: string;
  reviewer_id: string;
  reviewer_name: string | null;
  status: AssignmentStatus;
  assigned_at: string;
  ended_at: string | null;
  end_reason: string | null;
};

export type ReassignmentRow = {
  case_id: string;
  case_code: string;
  case_title: string;
  round_id: string;
  round_no: number;
  round_status: RoundStatus;
  active_reviewers_count: number;
  void_assignments: ReassignmentAssignment[];
  assignments: ReassignmentAssignment[];
};

export type ReplaceReviewerBody = {
  new_reviewer_id: string;
  reason: string;
};

export type ReplacedAssignment = {
  id: string;
  review_round_id: string;
  reviewer_id: string;
  status: AssignmentStatus;
  replaced_assignment_id: string | null;
};

export type ReviewerOption = {
  id: string;
  name: string;
};

/** Keputusan satu reviewer (VerdictDecision di server). */
export type VerdictDecision = "approve" | "revise";

/** Keputusan satu putaran review (RoundDecision di server). */
export type RoundDecision = "approved" | "revise";

export type VerdictView = {
  decision: VerdictDecision;
  comment: string | null;
  submitted_at: string | null;
};

/**
 * Satu reviewer di putaran. verdict null berarti belum menilai atau belum boleh dilihat;
 * untuk Admin server mengirim semuanya, jadi di halaman pemantauan null berarti belum menilai.
 */
export type ReviewerSlot = {
  assignment_id: string;
  reviewer: { id: string; name: string };
  status: AssignmentStatus;
  verdict: VerdictView | null;
};

export type CaseReview = {
  case_id: string;
  case_version_id: string;
  round_no: number;
  status: RoundStatus;
  decision: RoundDecision | null;
  opened_at: string | null;
  decided_at: string | null;
  reviewers: ReviewerSlot[];
};

