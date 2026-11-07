import type { components } from "@/lib/generated/api";

/** Hasil penilaian satu sesi (POST /grade dan GET /results, PBI-14 AC3, AC6–AC8, server SCRUM-226). */
export type SessionGradingResponse = components["schemas"]["SessionGradingResponse"];
/** Satu baris tabel: satu kasus, skor rata-rata percobaannya, dan percobaannya. */
export type CaseGradeResult = components["schemas"]["CaseGradeResult"];
export type AttemptGradeResult = components["schemas"]["AttemptGradeResult"];

export type AttemptSource = components["schemas"]["AttemptSource"];

export type GradedSessionListItem = components["schemas"]["GradedSessionListItem"];
/** Skor dua jalur yang tidak pernah digabung (AC1): deterministik dan penilai LLM, Decimal sebagai string. */
export type ScorePair = components["schemas"]["ScorePair"];
/** Skor Dev, Test dan Gabungan yang terpisah (PBI-11 AC9). */
export type ThreeScores = components["schemas"]["ThreeScores"];

/** Satu baris GET /measurements/{id}/grading-runs (Admin): ringkasan satu run, tanpa rincian kasus (PBI-14 AC7). */
export type GradingRunSummary = components["schemas"]["GradingRunSummary"];
