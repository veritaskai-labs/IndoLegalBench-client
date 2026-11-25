import { formatScore } from "@/lib/grading/scoreFormat";
import { REPORT_LABELS } from "@/lib/reports/reportLabels";
import type { ReportRow } from "@/lib/reports/reportSections";
import { scoreBars, type ScoreMetric } from "@/lib/reports/scoreBars";
import type { ReportLanguage } from "@/types/reports";

const METRICS: readonly ScoreMetric[] = ["deterministic", "llm"];

/**
 * Satu grafik per skor, diurutkan dari tertinggi (SCRUM-346 A6, temuan N13), menggantikan grafik dua batang per
 * produk: pembaca tidak perlu mencocokkan warna legenda. Produk teratas biru tua, sisanya biru muda; yang seri
 * berwarna sama. Kedua skor tetap terpisah (PBI-15 AC6) dan tidak ada garis target (AC7). Disembunyikan dari
 * pembaca layar karena tabel di atasnya memuat angka yang sama (K4).
 */
export function ReportScoreCharts({ rows, language }: Readonly<{ rows: readonly ReportRow[]; language: ReportLanguage }>) {
  const labels = REPORT_LABELS[language];
  const charts = METRICS.map((metric) => ({ metric, bars: scoreBars(rows, metric) })).filter(
    (chart) => chart.bars.length > 0,
  );
  if (charts.length === 0) return null;

  return (
    <div aria-hidden="true" className="grid gap-3 md:grid-cols-2">
      {charts.map(({ metric, bars }) => (
        <div key={metric} data-chart className="space-y-3 rounded-control border border-line bg-paper p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="font-serif text-base font-semibold text-ink">
              {metric === "deterministic" ? labels.deterministic : labels.llm}
            </h3>
            <span className="text-xs text-muted">0–1, urut dari tertinggi</span>
          </div>
          <div className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_3rem] items-center gap-x-3 gap-y-2">
            {bars.map((bar) => (
              <div key={bar.resultId} data-product={bar.product} data-top={String(bar.top)} className="contents">
                <span className="break-words text-xs font-semibold text-ink">{bar.product}</span>
                <span className="relative h-3.5 overflow-hidden rounded-[2px] bg-surface">
                  <span
                    data-fill
                    className={`absolute inset-y-0 left-0 rounded-[2px] ${bar.top ? "bg-accent" : "bg-accent/40"}`}
                    style={{ width: `${Math.round(bar.percent * 100) / 100}%` }}
                  />
                </span>
                <span data-value className="text-right text-xs tabular-nums text-ink-soft">
                  {formatScore(bar.score, language)}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted">Biru tua menandai skor tertinggi; produk yang seri berwarna sama.</p>
        </div>
      ))}
    </div>
  );
}
