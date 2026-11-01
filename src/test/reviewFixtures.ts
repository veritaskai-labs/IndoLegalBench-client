import type {
  AssignedReview,
  AwaitingRevisionReview,
  CaseReview,
  ReviewCopy,
  ReviewerSlot,
  VerdictResult,
  VerdictView,
} from "@/types/review";

/** Data contoh bersama untuk test tinjauan, supaya bentuknya tidak disalin per file. */

export const ASSIGNMENT_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
export const OTHER_ASSIGNMENT_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
export const CASE_ID = "cccccccc-cccc-cccc-cccc-cccccccccccc";
export const AUTHOR_ID = "dddddddd-dddd-dddd-dddd-dddddddddddd";

/** Satu rujukan hukum bentuk baru; teks penulisannya datang dari server (display_text). */
export function structuredRef(displayText: string): ReviewCopy["legal_refs"][number] {
  return { kind: "structured", links: [], display_text: displayText };
}

export function makeReviewCopy(overrides: Partial<ReviewCopy> = {}): ReviewCopy {
  return {
    case_id: CASE_ID,
    case_code: "ILB-PT-0142",
    author_id: AUTHOR_ID,
    case_version_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    version_no: 3,
    split_tag: "dev",
    identity: {
      title: "Kewajiban pemberitahuan tertulis sebelum PHK",
      question: "Apakah pemberitahuan tertulis kepada pekerja wajib sebelum PHK?",
      category: "Ketenagakerjaan",
    },
    legal_refs: [],
    answer_criteria: { must_contain: [], must_not_contain: [], expected_conclusion: null },
    traps: [],
    ...overrides,
  };
}

export function makeVerdictView(overrides: Partial<VerdictView> = {}): VerdictView {
  return {
    decision: "approve",
    comment: null,
    submitted_at: "2026-10-14T03:00:00Z",
    ...overrides,
  };
}

export function makeAssigned(overrides: Partial<AssignedReview> = {}): AssignedReview {
  return {
    assignment_id: ASSIGNMENT_ID,
    round_no: 1,
    assigned_at: "2026-10-13T08:00:00Z",
    case: makeReviewCopy(),
    my_verdict: null,
    ...overrides,
  };
}

export function makeSlot(overrides: Partial<ReviewerSlot> = {}): ReviewerSlot {
  return {
    assignment_id: OTHER_ASSIGNMENT_ID,
    reviewer: { id: "ffffffff-ffff-ffff-ffff-ffffffffffff", name: "Anisa P." },
    status: "active",
    verdict: null,
    ...overrides,
  };
}

export function makeCaseReview(overrides: Partial<CaseReview> = {}): CaseReview {
  return {
    case_id: CASE_ID,
    case_version_id: "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee",
    round_no: 1,
    status: "open",
    decision: null,
    opened_at: "2026-10-13T08:00:00Z",
    decided_at: null,
    reviewers: [makeSlot()],
    ...overrides,
  };
}

export function makeVerdictResult(overrides: Partial<VerdictResult> = {}): VerdictResult {
  return {
    decision: "approve",
    comment: null,
    submitted_at: "2026-10-14T03:00:00Z",
    assignment_id: ASSIGNMENT_ID,
    round_status: "open",
    round_decision: null,
    ...overrides,
  };
}

export function makeAwaiting(overrides: Partial<AwaitingRevisionReview> = {}): AwaitingRevisionReview {
  return {
    assignment_id: ASSIGNMENT_ID,
    case_id: CASE_ID,
    case_code: "ILB-PT-0142",
    title: "Kewajiban pemberitahuan tertulis sebelum PHK",
    round_no: 1,
    my_decision: "revise",
    decided_at: "2026-10-14T03:00:00Z",
    thread_assignment_ids: [ASSIGNMENT_ID],
    ...overrides,
  };
}
