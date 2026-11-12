import type { AsyncResource } from "@/hooks/useAsyncResource";
import type { GradeEstimate } from "@/types/grading";
import type { JudgeProviderOption } from "@/types/provider";

export interface EstimateRow {
  label: string;
  value: string;
}

export interface EstimateView {
  rows: EstimateRow[];
  budgetSufficient: boolean;
  hasAttempts: boolean;
}

export const BUDGET_SHORT_TEXT = "";
export const NO_ATTEMPTS_TEXT = "";

export function toEstimateView(_estimate: GradeEstimate, _judges: readonly JudgeProviderOption[]): EstimateView {
  return { rows: [], budgetSufficient: false, hasAttempts: false };
}

export function canStartGrading(_resource: AsyncResource<EstimateView | null>): boolean {
  return false;
}
