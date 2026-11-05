import { apiFetch, ApiError } from "@/lib/apiClient";
import type {
  StartMeasurementRequest,
  StartMeasurementResponse,
  SummaryRequest,
  SummaryResponse,
} from "@/types/measurement";

const SUMMARY_PATH = "/measurements/summary";
const START_PATH = "/measurements";

/**
 * Meminta ringkasan kasus dan perkiraan biaya sebelum pengukuran dimulai (PBI-11 AC5).
 */
export async function getMeasurementSummary(
  payload: SummaryRequest,
): Promise<SummaryResponse> {
  return apiFetch<SummaryResponse>(SUMMARY_PATH, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Memulai pengukuran otomatis baru (PBI-11 AC1, SCRUM-207).
 * Sesi akan berstatus "queued" (Menunggu).
 */
export async function startMeasurement(
  payload: StartMeasurementRequest,
): Promise<StartMeasurementResponse> {
  return apiFetch<StartMeasurementResponse>(START_PATH, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Pesan untuk pengguna dari galat panggilan pengukuran. ApiError membawa kode galat sebagai
 * message, jadi yang ditampilkan adalah pesan dari server; fallback bila server tidak
 * mengirimnya (misalnya balasan 502 bukan JSON).
 */
export function measurementErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) return error.serverMessage ?? fallback;
  if (error instanceof Error) return error.message || fallback;
  return fallback;
}

export interface BudgetExceededInfo {
  productName: string | null;
  remainingBudgetIdr: string | null;
  estimatedCostIdr: string | null;
  message: string;
}

/**
 * Mengekstrak informasi batas anggaran jika error berkode BUDGET_EXCEEDED (PBI-11 AC5).
 */
export function extractBudgetExceeded(error: unknown): BudgetExceededInfo | null {
  if (!(error instanceof ApiError) || error.code !== "BUDGET_EXCEEDED") {
    return null;
  }

  const details = error.details;
  const productName =
    typeof details?.product_name === "string" ? details.product_name : null;
  const remainingBudgetIdr =
    typeof details?.remaining_budget_idr === "string"
      ? details.remaining_budget_idr
      : null;
  const estimatedCostIdr =
    typeof details?.estimated_cost_idr === "string"
      ? details.estimated_cost_idr
      : null;

  return {
    productName,
    remainingBudgetIdr,
    estimatedCostIdr,
    message:
      error.serverMessage ??
      "Perkiraan biaya melebihi sisa anggaran produk bulan ini. Pengukuran tidak dapat dijalankan.",
  };
}
