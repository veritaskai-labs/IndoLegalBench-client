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
/** Penyebab sesi berhenti (server#97): user, budget, restart untuk paused; error untuk failed. */
export type StopReason = components["schemas"]["StopReason"];
export type SessionArchiveResponse = components["schemas"]["SessionArchiveResponse"];
/** PATCH dan DELETE /measurements/{id}/accept: tanda terima apa adanya (PBI-12 AC9, server SCRUM-214). */
export type SessionAcceptResponse = components["schemas"]["SessionAcceptResponse"];
/** 202 dari Jeda dan Batalkan (PBI-12 AC7, server SCRUM-216). */
export type SessionControlResponse = components["schemas"]["SessionControlResponse"];
/** 202 dari Lanjutkan, dengan penanda jeda panjang dan versi model belum terverifikasi (AC8). */
export type SessionResumeResponse = components["schemas"]["SessionResumeResponse"];
/** 202 dari Coba ulang yang gagal: percobaan yang kembali pending (PBI-12 AC3, server SCRUM-218). */
export type SessionRetryResponse = components["schemas"]["SessionRetryResponse"];

/** GET /measurements/{id}: daftar kolom ditambah snapshot dan jawaban mentah (PBI-11 AC7, AC8). */
export type SessionDetail = components["schemas"]["SessionDetail"];
export type SessionCaseResult = components["schemas"]["SessionCaseResult"];
export type AttemptResult = components["schemas"]["AttemptResult"];
export type AttemptStatus = components["schemas"]["AttemptStatus"];

export type MeasurementProgress = components["schemas"]["ProgressResponse"];



export type CallAttemptLog = components["schemas"]["CallAttemptLog"];
export type AttemptCalls = components["schemas"]["AttemptCalls"];

