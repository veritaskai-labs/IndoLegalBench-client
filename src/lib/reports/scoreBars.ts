import type { ReportRow } from "./reportSections";

export type ScoreMetric = "deterministic" | "llm";

export type ScoreBar = { product: string; resultId: string; score: string; percent: number; top: boolean };

export function scoreBars(_rows: readonly ReportRow[], _metric: ScoreMetric): ScoreBar[] {
  return [];
}
