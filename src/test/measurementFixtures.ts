import type { StartMeasurementResponse, SummaryResponse } from "@/types/measurement";

/**
 * Respons server untuk tes alur pengukuran (PBI-11), ditulis seperti server mengirimnya
 * (angka rupiah berupa string, kolom galat di level atas), supaya tes lewat apiFetch asli
 * dan tidak bergantung pada bentuk yang dibuat sendiri oleh tes.
 */

export function buildSummaryResponse(overrides: Partial<SummaryResponse> = {}): SummaryResponse {
  return {
    case_count: 10,
    total_calls: 30,
    case_filter: "both",
    repeat_count: 3,
    estimated_cost_idr: "883.01",
    remaining_budget_idr: "500000.00",
    ...overrides,
  };
}

export const SESSION_ID = "6f1c2d3e-4a5b-4c6d-8e7f-0a1b2c3d4e5f";

export function buildStartResponse(
  overrides: Partial<StartMeasurementResponse> = {},
): StartMeasurementResponse {
  return {
    session_id: SESSION_ID,
    status: "queued",
    queued_at: "2026-11-04T08:00:00+07:00",
    ...overrides,
  };
}

/** Galat domain server: code dan message, ditambah kolom khusus di level atas (bukan di details). */
export function buildServerError(
  code: string,
  message: string,
  extra: Record<string, unknown> = {},
): Record<string, unknown> {
  return { code, message, ...extra };
}

export function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
