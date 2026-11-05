import type { components } from "@/lib/generated/api";

export type CaseFilter = components["schemas"]["CaseFilter"];
export type SummaryRequest = components["schemas"]["SummaryRequest"];
export type SummaryResponse = components["schemas"]["SummaryResponse"];
export type MeasurementPurpose = components["schemas"]["MeasurementPurpose"];
export type StartMeasurementRequest = components["schemas"]["StartRequest"];
export type StartMeasurementResponse = components["schemas"]["StartResponse"];

export { CASE_FILTER_LABEL, MEASUREMENT_PURPOSE_LABEL } from "@/lib/runs/sessionDetail";

/** Satu baris GET /measurements (PBI-11 AC10, server SCRUM-210). */
export type SessionListItem = components["schemas"]["SessionListItem"];
export type SessionStatus = components["schemas"]["SessionStatus"];
export type SessionArchiveResponse = components["schemas"]["SessionArchiveResponse"];

/** GET /measurements/{id}: daftar kolom ditambah snapshot dan jawaban mentah (PBI-11 AC7, AC8). */
export type SessionDetail = components["schemas"]["SessionDetail"];
export type SessionCaseResult = components["schemas"]["SessionCaseResult"];
export type AttemptResult = components["schemas"]["AttemptResult"];
export type AttemptStatus = components["schemas"]["AttemptStatus"];

export type MeasurementProgress = components["schemas"]["ProgressResponse"];


/**
 * Temporary contracts for SCRUM-218 (server PR #99).
 * Replace with generated OpenAPI types after backend integration.
 */
export interface CallAttemptLog {
  try_no: number;
  is_manual_retry: boolean;
  started_at: string;
  ended_at: string;
  duration_ms: number;
  result: string;
  failure_kind: string | null;
  model_version: string;
  error_summary: string | null;
  raw_response: Record<string, unknown> | null;
}

export interface AttemptCalls {
  attempt_id: string;
  repetition_no: number;
  status: AttemptStatus;
  masked: boolean;
  calls: CallAttemptLog[];
}
