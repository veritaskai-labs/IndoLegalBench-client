"use client";

import type { ReportsGateway } from "@/lib/reports/reportsApi";
import type { ReportValidateRequest, ReportValidation } from "@/types/reports";

export const VALIDATE_DELAY_MS = 300;

export interface ReportValidationState {
  verdict: ReportValidation | null;
  status: "checking" | "ready" | "error";
  message: string | null;
  reload: () => void;
}

export function useReportValidation(
  request: ReportValidateRequest,
  gateway: Pick<ReportsGateway, "validate">,
  delayMs: number = VALIDATE_DELAY_MS,
): ReportValidationState {
  void request;
  void gateway;
  void delayMs;
  return { verdict: null, status: "checking", message: null, reload: () => {} };
}
