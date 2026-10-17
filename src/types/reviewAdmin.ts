import type { components } from "@/lib/generated/api";

/**
 * Bentuk review sudah ada di kontrak sejak SCRUM-145 merge (server PR #45),
 * jadi diturunkan dari sana.
 */
export type AssignmentStatus = components["schemas"]["AssignmentStatus"];
export type RoundStatus = components["schemas"]["RoundStatus"];
export type VerdictDecision = components["schemas"]["VerdictDecision"];
export type RoundDecision = components["schemas"]["RoundDecision"];
export type VerdictView = components["schemas"]["VerdictView"];
export type ReviewerSlot = components["schemas"]["ReviewerSlot"];
export type CaseReview = components["schemas"]["CaseReview"];

/**
 * Bentuk antrean penugasan ulang dan penggantian reviewer dari SCRUM-147
 * (server PR #50, belum merge), jadi masih ditulis tangan. Diganti ke
 * components["schemas"][...] setelah PR itu masuk dan kontraknya disalin ulang.
 * Hanya field yang dipakai FE.
 */
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

/** Satu pilihan reviewer di dialog penggantian. */
export type ReviewerOption = {
  id: string;
  name: string;
};