import type { components } from "@/lib/generated/api";

/** Hasil penilaian satu sesi (POST /grade dan GET /results, PBI-14 AC3, AC6–AC8, server SCRUM-226). */
export type SessionGradingResponse = components["schemas"]["SessionGradingResponse"];
/** Satu baris tabel: satu kasus, skor rata-rata percobaannya, dan percobaannya. */
export type CaseGradeResult = components["schemas"]["CaseGradeResult"];
export type AttemptGradeResult = components["schemas"]["AttemptGradeResult"];

export type AttemptSource = components["schemas"]["AttemptSource"];

/** Satu baris GET /results/sessions: satu grading run beserta LLM judge dan versi rubriknya (server#137, SCRUM-296). */
export type GradedRunListItem = components["schemas"]["GradedRunListItem"];
/** Skor dua jalur yang tidak pernah digabung (AC1): deterministik dan penilai LLM, Decimal sebagai string. */
export type ScorePair = components["schemas"]["ScorePair"];
/** Skor Dev, Test dan Gabungan yang terpisah (PBI-11 AC9). */
export type ThreeScores = components["schemas"]["ThreeScores"];

/** Satu baris GET /measurements/{id}/grading-runs (Admin): ringkasan satu run, tanpa rincian kasus (PBI-14 AC7). */
export type GradingRunSummary = components["schemas"]["GradingRunSummary"];
/** LLM judge satu run: produk, model yang dilaporkan, total biaya panggilan yang tercatat (server#134). */
export type GradingJudge = components["schemas"]["GradingJudge"];

/** Perkiraan biaya penilaian sebelum tombol Nilai (POST /measurements/{id}/grade/estimate, Admin, server#135). */
export type GradeEstimate = components["schemas"]["GradeEstimateResponse"];
