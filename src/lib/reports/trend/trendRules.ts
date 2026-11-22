/* eslint-disable @typescript-eslint/no-unused-vars */
import type { Role } from "@/types";
import type { EligibleSession, ScoreScope, TrendPointRead, TrendRead } from "@/types/reports";

import type { TrendQuery } from "./trendApi";

export interface ProductOption {
  id: string;
  name: string;
}

export function canFilterTrendScope(role: Role | null): boolean {
  return false;
}

export function effectiveTrendScope(role: Role | null, scope: ScoreScope): ScoreScope {
  return scope;
}

export function productOptions(sessions: readonly EligibleSession[]): ProductOption[] {
  return [];
}

export function trendErrorMessage(error: unknown): string {
  return "";
}

export function trendPdfErrorMessage(error: unknown): string {
  return "";
}

export function trendPdfFileName(query: TrendQuery): string {
  return "";
}

export function hasDrawablePoint(points: readonly TrendPointRead[]): boolean {
  return false;
}

export function pointNotes(point: TrendPointRead): string[] {
  return [];
}

export function trendWarnings(read: TrendRead): string[] {
  return [];
}
