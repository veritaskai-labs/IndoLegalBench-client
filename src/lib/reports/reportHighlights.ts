import type { ReportRow } from "./reportSections";

export type HighlightMetric = "deterministic" | "llm" | "failureRate";

export type ReportHighlight = {
  metric: HighlightMetric;
  title: string;
  leaders: string[];
  sentence: string;
};

export function reportHighlights(_rows: readonly ReportRow[]): ReportHighlight[] {
  return [];
}
