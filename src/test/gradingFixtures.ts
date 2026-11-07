import type { AttemptGradeResult, CaseGradeResult, SessionGradingResponse } from "@/types/grading";

/** Data contoh bersama untuk test penilaian (PBI-14), supaya bentuk kontrak #114 tidak disalin per file. Data sintetis. */
export function gradedAttempt(overrides: Partial<AttemptGradeResult> = {}): AttemptGradeResult {
  return {
    attempt_id: "a-1",
    repetition_no: 1,
    status: "succeeded",
    is_technical_disruption: false,
    score: { deterministic: "1.00", judge: "4.00" },
    answer_text: "Jawaban contoh",
    ...overrides,
  };
}

export function gradedCase(overrides: Partial<CaseGradeResult> = {}): CaseGradeResult {
  return {
    snapshot_item_id: "item-1",
    case_id: "case-1",
    case_code: "KC-001",
    title: "Kasus contoh A",
    split_tag: "dev",
    category: null,
    question: "Pertanyaan contoh",
    masked: false,
    scores: { deterministic: "1.00", judge: "4.00" },
    attempts: [gradedAttempt()],
    ...overrides,
  };
}

export function gradingResponse(overrides: Partial<SessionGradingResponse> = {}): SessionGradingResponse {
  return {
    grading_run_id: "run-1",
    session_id: "s-1",
    rubric_version: "v1",
    kind: "initial",
    status: "completed",
    triggered_by: "admin-1",
    triggered_at: "2026-11-07T03:00:00Z",
    is_latest: true,
    scores: {
      dev: { deterministic: "1.00", judge: "4.00" },
      test: { deterministic: "0.50", judge: "3.25" },
      combined: { deterministic: "0.75", judge: "3.63" },
    },
    category_scores: [],
    cases: [gradedCase()],
    ...overrides,
  };
}
