/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ProductOption } from "@/lib/reports/trend/trendRules";
import type { ScoreScope, TrendMetric, TrendRange } from "@/types/reports";

export interface TrendFiltersProps {
  products: readonly ProductOption[];
  productId: string;
  metric: TrendMetric;
  range: TrendRange;
  scope: ScoreScope;
  /** Jenis kasus yang boleh dipilih peran ini. Satu pilihan atau kurang berarti filternya tidak tampil. */
  scopes: readonly ScoreScope[];
  onProductChange: (productId: string) => void;
  onMetricChange: (metric: TrendMetric) => void;
  onRangeChange: (range: TrendRange) => void;
  onScopeChange: (scope: ScoreScope) => void;
}

export function TrendFilters(props: Readonly<TrendFiltersProps>) {
  return null;
}
