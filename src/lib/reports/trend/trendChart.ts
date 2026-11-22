/* eslint-disable @typescript-eslint/no-unused-vars */
import type { TrendPointRead } from "@/types/reports";

export interface PlotSize {
  width: number;
  height: number;
  padding: { top: number; right: number; bottom: number; left: number };
}

export interface PlotPoint {
  point: TrendPointRead;
  x: number;
  /** null bila titik tidak punya skor: tidak digambar dan tidak disambung. */
  y: number | null;
}

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

export function buildPlot(points: readonly TrendPointRead[], size: PlotSize): TrendPlot {
  return { points: [], segments: [], yTicks: [], scale: 1 };
}

export function monthLabel(month: string): string {
  return "";
}
