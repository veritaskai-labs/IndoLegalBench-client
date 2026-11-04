import type { components } from "@/lib/generated/api";

/** Satu baris GET /measurements (PBI-11 AC10, server SCRUM-210). */
export type SessionListItem = components["schemas"]["SessionListItem"];
export type SessionStatus = components["schemas"]["SessionStatus"];
export type SessionArchiveResponse = components["schemas"]["SessionArchiveResponse"];

/** GET /measurements/{id}: daftar kolom ditambah snapshot dan jawaban mentah (PBI-11 AC7, AC8). */
export type SessionDetail = components["schemas"]["SessionDetail"];
export type SessionCaseResult = components["schemas"]["SessionCaseResult"];
export type AttemptResult = components["schemas"]["AttemptResult"];
export type AttemptStatus = components["schemas"]["AttemptStatus"];
export type MeasurementPurpose = components["schemas"]["MeasurementPurpose"];
export type CaseFilter = components["schemas"]["CaseFilter"];
