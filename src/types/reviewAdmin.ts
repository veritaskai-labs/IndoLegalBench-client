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
 * Antrean penugasan ulang dan penggantian reviewer (SCRUM-147), ikut kontrak
 * sejak server PR #50 merge — sebelumnya ditulis tangan di sini.
 */
export type AssignmentSource = components["schemas"]["AssignmentSource"];
export type ReassignmentAssignment =
  components["schemas"]["ReassignmentAssignmentRead"];
export type ReassignmentRow = components["schemas"]["NeedsReassignmentResponse"];
export type ReplaceReviewerBody = components["schemas"]["ReplaceReviewerRequest"];
export type ReplacedAssignment = components["schemas"]["ReplaceReviewerResponse"];

/** Satu pilihan reviewer di dialog penggantian; bentuk UI, bukan bentuk server. */
export type ReviewerOption = {
  id: string;
  name: string;
};