import type { AttemptGradeResult, CaseGradeResult, SessionGradingResponse } from "@/types/grading";

/**
 * Data contoh bersama untuk test penilaian (PBI-14), supaya bentuk kontrak #114 tidak disalin per file. Data sintetis.
 * Skor sengaja 0–1 untuk ketiga jalur: tetap sah apa pun skala kualitas yang akhirnya dipakai server.
 */
export function gradedAttempt(overrides: Partial<AttemptGradeResult> = {}): AttemptGradeResult {
  return {
    attempt_id: "a-1",
    repetition_no: 1,
    status: "succeeded",
    is_technical_disruption: false,
    score: { deterministic: "1.00", quality: "0.80", format: "0.75" },
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
    scores: { deterministic: "1.00", quality: "0.80", format: "0.75" },
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
      dev: { deterministic: "1.00", quality: "0.80", format: "0.75" },
      test: { deterministic: "0.50", quality: "0.60", format: "0.50" },
      combined: { deterministic: "0.75", quality: "0.70", format: "0.63" },
    },
    category_scores: [],
    cases: [gradedCase()],
    ...overrides,
  };
}
