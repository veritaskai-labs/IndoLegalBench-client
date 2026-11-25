import { toNumber } from "./reportChart";
import type { ReportRow } from "./reportSections";

export type ScoreMetric = "deterministic" | "llm";

export type ScoreBar = {
  product: string;
  resultId: string;
  /** Teks skor dari server, untuk formatScore. */
  score: string;
  percent: number;
  /** Skor tertinggi di grafik ini; semua produk yang seri di puncak ikut ditandai. */
  top: boolean;
};

const PICK: Readonly<Record<ScoreMetric, (row: ReportRow) => string | null>> = {
  deterministic: (row) => row.result.det_score,
  llm: (row) => row.result.llm_score,
};

/**
 * Batang satu skor untuk grafik terurut (SCRUM-346 A6, temuan N13): dari skor tertinggi, tanpa produk yang tidak
 * punya skor (D1, K7). Skala grafik sama dengan chartScale, tapi hanya dari skor ini. Array.prototype.sort stabil,
 * jadi skor yang sama tetap mengikuti urutan peringkat server.
 */
export function scoreBars(rows: readonly ReportRow[], metric: ScoreMetric): ScoreBar[] {
  const scored = rows.flatMap((row) => {
    const score = PICK[metric](row);
    const value = toNumber(score);
    // toNumber gives a number only for a decimal string, so score is that string here.
    return value === null ? [] : [{ row, score: String(score), value }];
  });
  const best = Math.max(...scored.map((item) => item.value));
  const scale = Math.max(1, best);
  return scored
    .sort((a, b) => b.value - a.value)
    .map(({ row, score, value }) => ({
      product: row.session.product_label,
      resultId: row.result.id,
      score,
      // value is at most best, which is at most scale, so only a negative score needs clamping.
      percent: Math.max(0, (value / scale) * 100),
      top: value === best,
    }));
}
