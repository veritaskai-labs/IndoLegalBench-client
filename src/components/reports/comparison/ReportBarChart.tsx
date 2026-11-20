import { Fragment } from "react";

import { formatScore } from "@/lib/grading/scoreFormat";
import { axisTicks, barPercent, chartScale } from "@/lib/reports/reportChart";
import { REPORT_LABELS } from "@/lib/reports/reportLabels";
import type { ReportRow } from "@/lib/reports/reportSections";
import type { ReportLanguage } from "@/types/reports";

/** Warna sama dengan PDF (pdf.py _DET_COLOR dan _LLM_COLOR), supaya pembaca mengenali batang yang sama. */
const COLORS = { det: "#3B44C4", llm: "#147D7A" } as const;

type Metric = keyof typeof COLORS;

/** Label pertama rata kiri, terakhir rata kanan, sisanya di tengah titiknya, supaya tidak keluar dari lintasan. */
function tickAlignment(index: number, count: number): string {
  if (index === 0) return "";
  if (index === count - 1) return "-translate-x-full";
  return "-translate-x-1/2";
}

function Bar({
  product,
  metric,
  score,
  scale,
  language,
}: Readonly<{ product: string; metric: Metric; score: string | null; scale: number; language: ReportLanguage }>) {
  const percent = barPercent(score, scale);
  return (
    <div data-product={product} data-metric={metric} className="grid grid-cols-[minmax(0,1fr)_3rem] items-center gap-2">
      <div className="relative h-2.5 overflow-hidden rounded bg-slate-100">
        {percent !== null && (
          <div
            data-bar
            className="absolute inset-y-0 left-0 rounded"
            style={{ width: `${Math.round(percent * 100) / 100}%`, backgroundColor: COLORS[metric] }}
          />
        )}
      </div>
      <span className="text-xs tabular-nums text-slate-700">{formatScore(score, language)}</span>
    </div>
  );
}

/**
 * Grafik batang horizontal satu bagian laporan (Fase 0 K4): dua batang per produk, skor deterministik dan skor
 * penilai LLM, tidak digabung (AC6). Urutan dan warna sama dengan PDF. Skor kosong tidak diberi batang (K7).
 * Disembunyikan dari pembaca layar karena tabel di sebelahnya memuat angka yang sama.
 */
export function ReportBarChart({ rows, language }: Readonly<{ rows: readonly ReportRow[]; language: ReportLanguage }>) {
  const labels = REPORT_LABELS[language];
  const scale = chartScale(rows);
  const ticks = axisTicks(scale);

  return (
    <div aria-hidden="true" className="space-y-3">
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {(["det", "llm"] as const).map((metric) => (
          <span key={metric} className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: COLORS[metric] }} />
            {metric === "det" ? labels.deterministic : labels.llm}
          </span>
        ))}
      </div>
      <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:grid-cols-[7rem_minmax(0,1fr)]">
        {rows.map(({ session, result }) => (
          <Fragment key={session.product_label}>
            <span className="break-words text-xs font-semibold text-slate-800">{session.product_label}</span>
            <div className="space-y-1">
              <Bar product={session.product_label} metric="det" score={result.det_score} scale={scale} language={language} />
              <Bar product={session.product_label} metric="llm" score={result.llm_score} scale={scale} language={language} />
            </div>
          </Fragment>
        ))}
        <div className="relative col-start-2 mr-14 h-4">
          {ticks.map((tick, index) => (
            <span
              key={tick}
              data-tick
              className={`absolute text-[11px] text-slate-500 ${tickAlignment(index, ticks.length)}`}
              style={{ left: `${(index / (ticks.length - 1)) * 100}%` }}
            >
              {formatScore(tick, language)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
