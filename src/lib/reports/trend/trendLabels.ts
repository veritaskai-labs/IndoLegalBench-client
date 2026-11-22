/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ScoreScope, TrendMetric, TrendRange } from "@/types/reports";

export const TREND_METRIC_LABEL = {} as Readonly<Record<TrendMetric, string>>;
export const TREND_RANGE_LABEL = {} as Readonly<Record<TrendRange, string>>;
export const TREND_SCOPE_LABEL = {} as Readonly<Record<ScoreScope, string>>;

export function breakLabel(code: string): string {
  return "";
}

export function markerLabel(code: string): string {
  return "";
}

export function warningLabel(code: string): string {
  return "";
}
