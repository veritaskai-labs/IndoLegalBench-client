import { TREND_METRIC_LABEL, TREND_RANGE_LABEL, TREND_SCOPE_LABEL } from "@/lib/reports/trend/trendLabels";
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

const SELECT =
  "rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none";

const METRICS = Object.entries(TREND_METRIC_LABEL) as [TrendMetric, string][];
const RANGES = Object.entries(TREND_RANGE_LABEL) as [TrendRange, string][];

function Field({ label, children }: Readonly<{ label: string; children: React.ReactNode }>) {
  return (
    // SCRUM-346 A3 (AC5): full width and stacked on a phone, side by side from the sm breakpoint.
    <label className="flex w-full flex-col gap-1 text-xs font-medium text-slate-600 sm:w-auto">
      {label}
      {children}
    </label>
  );
}

/**
 * Pilihan produk, metrik, rentang waktu, dan jenis kasus. Pilihan hanya diteruskan ke atas; menentukan pilihan
 * mana yang sah untuk sebuah peran adalah urusan aturan (trendRules), bukan komponen ini. Filter jenis kasus
 * tidak dirender sama sekali bila peran hanya boleh melihat skor test (PBI-17 AC1, AC12).
 */
export function TrendFilters({
  products,
  productId,
  metric,
  range,
  scope,
  scopes,
  onProductChange,
  onMetricChange,
  onRangeChange,
  onScopeChange,
}: Readonly<TrendFiltersProps>) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label="Produk">
        <select className={SELECT} value={productId} onChange={(event) => onProductChange(event.target.value)}>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Metrik">
        <select className={SELECT} value={metric} onChange={(event) => onMetricChange(event.target.value as TrendMetric)}>
          {METRICS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Rentang waktu">
        <select className={SELECT} value={range} onChange={(event) => onRangeChange(event.target.value as TrendRange)}>
          {RANGES.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      {scopes.length > 1 && (
        <Field label="Jenis kasus">
          <select className={SELECT} value={scope} onChange={(event) => onScopeChange(event.target.value as ScoreScope)}>
            {scopes.map((value) => (
              <option key={value} value={value}>
                {TREND_SCOPE_LABEL[value]}
              </option>
            ))}
          </select>
        </Field>
      )}
    </div>
  );
}
