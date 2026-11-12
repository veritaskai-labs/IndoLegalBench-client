import type { AsyncResource } from "@/hooks/useAsyncResource";
import { formatRupiah, formatRupiahDown } from "@/lib/providers/format";
import { versionText } from "@/lib/rubrics/gradingRun";
import type { GradeEstimate } from "@/types/grading";
import type { JudgeProviderOption } from "@/types/provider";

/** Satu baris tabel perkiraan, siap tampil tanpa logika di komponen. */
export interface EstimateRow {
  label: string;
  value: string;
}

export interface EstimateView {
  rows: EstimateRow[];
  /** Dari server (budget_sufficient): FE tidak membandingkan angka sendiri. */
  budgetSufficient: boolean;
  hasAttempts: boolean;
}

export const BUDGET_SHORT_TEXT =
  "Perkiraan biaya melebihi sisa anggaran penilai. Penilaian belum bisa dimulai. Tambah anggaran judge di halaman Provider atau pilih judge lain.";

export const NO_ATTEMPTS_TEXT = "Tidak ada percobaan yang perlu dikirim ke judge, jadi penilaian ini tidak memakai anggaran.";

const UNKNOWN_JUDGE = "Judge yang dipilih";

/** Nama judge dari id jawaban server; daftar yang gagal dimuat tidak menghalangi perkiraan tampil. */
function judgeName(id: string, judges: readonly JudgeProviderOption[]): string {
  return judges.find((judge) => judge.id === id)?.name ?? UNKNOWN_JUDGE;
}

/**
 * Perkiraan biaya penilaian (PBI-14 AC6) sebagai baris tabel. Biaya memakai formatRupiah seperti
 * ringkasan pengukuran (PBI-11); sisa anggaran dibulatkan ke bawah (keputusan PO, 3 Nov) supaya
 * angka yang tampil tidak pernah lebih besar dari sisa sebenarnya.
 */
export function toEstimateView(estimate: GradeEstimate, judges: readonly JudgeProviderOption[]): EstimateView {
  return {
    rows: [
      { label: "Jumlah percobaan", value: String(estimate.attempts_to_grade) },
      { label: "Versi rubrik", value: versionText(estimate.rubric_version) },
      { label: "LLM judge", value: judgeName(estimate.judge_provider_id, judges) },
      { label: "Perkiraan biaya", value: formatRupiah(estimate.estimated_cost_idr) },
      { label: "Sisa anggaran judge", value: formatRupiahDown(estimate.remaining_budget_idr) },
    ],
    budgetSufficient: estimate.budget_sufficient,
    hasAttempts: estimate.attempts_to_grade > 0,
  };
}

/**
 * Tombol mulai hanya hidup bila perkiraan sudah ada dan anggaran cukup. Selagi dimuat, gagal, atau
 * belum diminta (null), Admin belum tahu biayanya, jadi tombol tetap mati. Tanpa percobaan biayanya
 * nol dan anggaran cukup, jadi server yang memutuskan langkah berikutnya.
 */
export function canStartGrading(resource: AsyncResource<EstimateView | null>): boolean {
  return resource.status === "ready" && resource.data !== null && resource.data.budgetSufficient;
}
