import { apiFetch, apiFetchBlob } from "@/lib/apiClient";
import type { ScoreScope, TrendMetric, TrendRange, TrendRead } from "@/types/reports";

/** Pilihan di halaman tren. Ketiganya enum dari kontrak, jadi tidak ada aturan validasi yang disalin ke sini. */
export interface TrendQuery {
  productId: string;
  scope: ScoreScope;
  metric: TrendMetric;
  range: TrendRange;
}

/**
 * silentForbidden: skor dev untuk peran yang tidak berhak dijawab 403 TREND_SCOPE_FORBIDDEN, dan halaman tren
 * menjelaskannya sendiri tanpa pindah ke /forbidden.
 */
export interface TrendGateway {
  /** Satu titik per bulan dari sesi terbaru, hanya pada kasus yang sama (PBI-17 AC4, AC11). */
  get(query: TrendQuery): Promise<TrendRead>;
  /** PDF dari tren yang sama dengan grafik, dengan pilihan yang sama (PBI-17 AC8). */
  pdf(query: TrendQuery): Promise<Blob>;
}

function trendPath(base: string, { productId, scope, metric, range }: TrendQuery): string {
  const params = new URLSearchParams({ product_id: productId, score_scope: scope, metric, range });
  return `${base}?${params.toString()}`;
}

export const httpTrendGateway: TrendGateway = {
  get: (query) => apiFetch<TrendRead>(trendPath("/reports/trend", query), { silentForbidden: true }),
  pdf: (query) => apiFetchBlob(trendPath("/reports/trend/pdf", query), { silentForbidden: true }),
};
