import type { components } from "@/lib/generated/api";

export type CaseFilter = components["schemas"]["CaseFilter"];
export type SummaryRequest = components["schemas"]["SummaryRequest"];
export type SummaryResponse = components["schemas"]["SummaryResponse"];
export type MeasurementPurpose = components["schemas"]["MeasurementPurpose"];
export type StartMeasurementRequest = components["schemas"]["StartRequest"];
export type StartMeasurementResponse = components["schemas"]["StartResponse"];

export const CASE_FILTER_LABEL: Record<CaseFilter, string> = {
  both: "Semua (Dev & Test)",
  dev: "Hanya Dev",
  test: "Hanya Test",
};

export const MEASUREMENT_PURPOSE_LABEL: Record<MeasurementPurpose, string> = {
  official: "Pengukuran Resmi",
  trial: "Uji Coba",
};

export type JudgeProvider =
  | "deepseek-v4-flash"
  | "deepseek-v4-pro"
  | "gemini-3.5-flash-lite"
  | "gemini-3.8-flash"
  | "gemini-2.5-pro";

export const JUDGE_PROVIDER_OPTIONS: { value: JudgeProvider; label: string }[] = [
  { value: "deepseek-v4-flash", label: "DeepSeek V4-Flash (Default)" },
  { value: "deepseek-v4-pro", label: "DeepSeek V4-Pro" },
  { value: "gemini-3.5-flash-lite", label: "Google Gemini 3.5 Flash-Lite" },
  { value: "gemini-3.8-flash", label: "Google Gemini 3.8 Flash" },
  { value: "gemini-2.5-pro", label: "Google Gemini 2.5 Pro" },
];

/** Satu baris GET /measurements (PBI-11 AC10, server SCRUM-210). */
export type SessionListItem = components["schemas"]["SessionListItem"];
export type SessionStatus = components["schemas"]["SessionStatus"];
export type SessionArchiveResponse = components["schemas"]["SessionArchiveResponse"];
