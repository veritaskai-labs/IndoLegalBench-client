/** Width of a score bar in percent. Scores run from 0 to 1; anything else is clamped or drawn empty. */
export function barWidthPercent(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.round(Math.min(Math.max(score, 0), 1) * 100);
}

/** Score from text such as "0.85". Blank, dash or non-numeric text means there is no score. */
export function parseScore(text: string | null | undefined): number | null {
  const trimmed = text?.trim();
  if (!trimmed) return null;
  const score = Number(trimmed);
  return Number.isFinite(score) ? score : null;
}

export function formatScore(score: number | null): string {
  return score === null ? "–" : score.toFixed(2);
}
