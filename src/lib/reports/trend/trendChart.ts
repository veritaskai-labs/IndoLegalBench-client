import { axisTicks, toNumber } from "@/lib/reports/reportChart";
import type { TrendPointRead } from "@/types/reports";

export interface PlotSize {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface PlotPoint {
  point: TrendPointRead;
  x: number;
  /** null bila titik tidak punya skor: tidak digambar dan tidak disambung (PBI-17 AC11). */
  y: number | null;
}

/** Satu ruas garis antara dua titik bersambung. Putus-putus bila titik tujuan berganti versi (PBI-17 AC5). */
export interface PlotSegment {
  from: PlotPoint;
  to: PlotPoint;
  dashed: boolean;
}

export interface PlotTick {
  y: number;
  label: string;
}

export interface TrendPlot {
  points: PlotPoint[];
  segments: PlotSegment[];
  yTicks: PlotTick[];
  scale: number;
}

/** Bulan sebagai satu bilangan berurutan, supaya jarak antar titik mengikuti kalender dan melewati pergantian tahun. */
function monthNumber(month: string): number {
  const [year, monthOfYear] = month.split("-").map(Number);
  return year * 12 + (monthOfYear - 1);
}

/**
 * Koordinat grafik dari titik-titik tren, tanpa menyentuh DOM. Sumbu x mengikuti bulan kalender, jadi bulan tanpa
 * sesi tampak sebagai celah (PBI-17 AC4). Sumbu y berskala 0 sampai 1 dan hanya melebar bila server mengirim
 * skor lebih besar, sama dengan grafik batang laporan.
 */
export function buildPlot(points: readonly TrendPointRead[], size: PlotSize): TrendPlot {
  const { width, height, padding } = size;
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const values = points.map((point) => toNumber(point.value));
  const scale = Math.max(1, ...values.filter((value): value is number => value !== null));
  const months = points.map((point) => monthNumber(point.month));
  const first = Math.min(...months);
  const span = Math.max(...months) - first;

  const plotted: PlotPoint[] = points.map((point, index) => {
    const value = values[index];
    return {
      point,
      // Satu bulan saja tidak punya lebar untuk dibagi, jadi titiknya di tengah.
      x: padding.left + (span === 0 ? innerWidth / 2 : ((months[index] - first) / span) * innerWidth),
      y: value === null ? null : padding.top + innerHeight * (1 - value / scale),
    };
  });

  const segments: PlotSegment[] = [];
  for (let index = 1; index < plotted.length; index++) {
    const from = plotted[index - 1];
    const to = plotted[index];
    if (from.y !== null && to.y !== null) segments.push({ from, to, dashed: to.point.breaks.length > 0 });
  }

  const labels = axisTicks(scale);
  const yTicks = labels.map((label, index) => ({
    label,
    y: padding.top + innerHeight * (1 - index / (labels.length - 1)),
  }));

  return { points: plotted, segments, yTicks, scale };
}

const MONTH_FORMAT = new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "UTC" });

/** "2026-09-01" menjadi "Sep 2026". UTC, supaya zona waktu peramban tidak menggeser bulannya. */
export function monthLabel(month: string): string {
  return MONTH_FORMAT.format(new Date(`${month}T00:00:00Z`));
}
