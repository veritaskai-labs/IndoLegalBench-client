import { formatScore } from "@/lib/grading/scoreFormat";
import { buildPlot, monthLabel, type PlotPoint, type PlotSize } from "@/lib/reports/trend/trendChart";
import type { TrendMetric, TrendPointRead } from "@/types/reports";

/** Warna deterministik dan LLM sama dengan grafik batang dan PDF; skor total punya warna sendiri. */
const COLORS: Readonly<Record<TrendMetric, string>> = { total: "#6D28D9", deterministic: "#3B44C4", llm: "#147D7A" };

const SIZE: PlotSize = { width: 640, height: 320, padding: { top: 24, right: 16, bottom: 36, left: 48 } };
const DASH = "6 4";
const MAX_MONTH_LABELS = 8;

/** Ruas hanya menyambung dua titik yang punya skor, jadi y selalu ada; 0 hanya menenangkan tipe. */
function yOf(plotted: PlotPoint): number {
  return plotted.y ?? 0;
}

/**
 * Grafik garis satu metrik (PBI-17 AC3), digambar sebagai SVG dari koordinat trendChart. Garis putus-putus masuk
 * ke titik yang berganti versi dan titik itu berongga (AC5); segitiga menandai titik dengan penanda seperti
 * jumlah percobaan berbeda. Bulan tanpa skor tidak digambar dan tidak disambung (AC11). Tidak ada garis target
 * (AC7). Disembunyikan dari pembaca layar karena tabel di sebelahnya memuat angka dan catatan yang sama.
 */
export function TrendChart({ points, metric }: Readonly<{ points: readonly TrendPointRead[]; metric: TrendMetric }>) {
  const color = COLORS[metric];
  const plot = buildPlot(points, SIZE);
  const { width, height, padding } = SIZE;
  // Terlalu banyak bulan membuat label bertumpuk, jadi hanya tiap beberapa titik yang diberi label.
  const labelStep = Math.ceil(plot.points.length / MAX_MONTH_LABELS);

  return (
    <div aria-hidden="true" className="space-y-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full">
        {plot.yTicks.map((tick) => (
          <g key={tick.label}>
            <line x1={padding.left} x2={width - padding.right} y1={tick.y} y2={tick.y} stroke="#E2E8F0" />
            <text x={padding.left - 8} y={tick.y} textAnchor="end" dominantBaseline="middle" fontSize="11" fill="#64748B">
              {formatScore(tick.label)}
            </text>
          </g>
        ))}
        {plot.segments.map(({ from, to, dashed }) => (
          <line
            key={from.point.month}
            data-segment
            data-dashed={String(dashed)}
            x1={from.x}
            y1={yOf(from)}
            x2={to.x}
            y2={yOf(to)}
            stroke={color}
            strokeWidth="2"
            strokeDasharray={dashed ? DASH : undefined}
          />
        ))}
        {plot.points.map((plotted, index) => (
          <g key={plotted.point.month}>
            {index % labelStep === 0 && (
              <text x={plotted.x} y={height - 12} textAnchor="middle" fontSize="11" fill="#64748B">
                {monthLabel(plotted.point.month)}
              </text>
            )}
            {plotted.y !== null && <PointMark plotted={plotted} y={plotted.y} color={color} />}
          </g>
        ))}
      </svg>
      <Legend color={color} />
    </div>
  );
}

function PointMark({ plotted, y, color }: Readonly<{ plotted: PlotPoint; y: number; color: string }>) {
  const { x, point } = plotted;
  const hasBreak = point.breaks.length > 0;
  return (
    <>
      <circle
        data-point
        data-break={String(hasBreak)}
        cx={x}
        cy={y}
        r="5"
        fill={hasBreak ? "#FFFFFF" : color}
        stroke={color}
        strokeWidth="2"
      />
      {point.markers.length > 0 && (
        <polygon data-marker points={`${x},${y - 16} ${x - 5},${y - 8} ${x + 5},${y - 8}`} fill="#B45309" />
      )}
    </>
  );
}

function Legend({ color }: Readonly<{ color: string }>) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      <li className="inline-flex items-center gap-1.5">
        <svg width="24" height="8" aria-hidden="true">
          <line x1="0" x2="24" y1="4" y2="4" stroke={color} strokeWidth="2" />
        </svg>
        Garis sambung
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg width="24" height="8" aria-hidden="true">
          <line x1="0" x2="24" y1="4" y2="4" stroke={color} strokeWidth="2" strokeDasharray={DASH} />
        </svg>
        Putus-putus dan titik kosong: data pembanding berbeda
      </li>
      <li className="inline-flex items-center gap-1.5">
        <svg width="12" height="10" aria-hidden="true">
          <polygon points="6,0 0,9 12,9" fill="#B45309" />
        </svg>
        Penanda, misalnya jumlah percobaan berbeda
      </li>
    </ul>
  );
}
