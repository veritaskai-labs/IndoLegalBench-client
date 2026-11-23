import type { ReportValidation, ReportViolation, ReportWarning, ScoreScope } from "@/types/reports";

export const SCOPE_UNAVAILABLE: Readonly<Record<ScoreScope, string>> = { test: "", dev: "", dev_test: "" };
export const SCOPE_WAITING = "";

export interface ValidationView {
  general: ReportViolation[];
  bySession: ReadonlyMap<string, ReportViolation[]>;
  warnings: ReportWarning[];
  blocking: boolean;
}

export interface ScopeOption {
  scope: ScoreScope;
  disabled: boolean;
  reason: string | null;
}

export function validationView(validation: ReportValidation | null): ValidationView {
  void validation;
  return { general: [], bySession: new Map(), warnings: [], blocking: false };
}

export function scopeOptions(allowed: readonly ScoreScope[], validation: ReportValidation | null): ScopeOption[] {
  void validation;
  return allowed.map((scope) => ({ scope, disabled: false, reason: null }));
}

export function chooseScope(current: ScoreScope, options: readonly ScopeOption[]): ScoreScope {
  void options;
  return current;
}
