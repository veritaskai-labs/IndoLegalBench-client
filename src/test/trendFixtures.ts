import type { TrendPointRead, TrendRead } from "@/types/reports";

/** Data contoh bersama untuk halaman tren (PBI-17). Semua angka sintetis, bukan hasil pengukuran produk mana pun. */
export function trendPoint(overrides: Partial<TrendPointRead> = {}): TrendPointRead {
  return {
    month: "2026-09-01",
    label: "Sesi September",
    value: "0.80",
    breaks: [],
    markers: [],
    case_count: 40,
    ...overrides,
  };
}

export function trendRead(overrides: Partial<TrendRead> = {}): TrendRead {
  return {
    product_id: "11111111-1111-4111-8111-111111111111",
    product_name: "AiYU",
    score_scope: "test",
    metric: "total",
    range: "all",
    points: [
      trendPoint({ month: "2026-09-01", label: "Sesi September", value: "0.80" }),
      trendPoint({ month: "2026-10-01", label: "Sesi Oktober", value: "0.85" }),
    ],
    warnings: [],
    ...overrides,
  };
}
