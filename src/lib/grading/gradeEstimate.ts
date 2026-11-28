import type { AsyncResource } from "@/hooks/useAsyncResource";
import { formatRupiah, formatRupiahDown } from "@/lib/providers/format";
import { versionText } from "@/lib/rubrics/gradingRun";
import type { GradeEstimate } from "@/types/grading";

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
  "Perkiraan biaya melebihi sisa anggaran bulanan penilai ini. Penilaian belum bisa dimulai. Tambah anggaran produk ini di halaman Produk AI atau pilih penilai lain.";

export const NO_ATTEMPTS_TEXT = "Tidak ada percobaan yang perlu dikirim ke penilai LLM, jadi penilaian ini tidak memakai anggaran.";

/**
 * Perkiraan biaya penilaian (PBI-14 AC6) sebagai baris tabel, urutan SCRUM-375 C1: versi rubrik,
 * percobaan, biaya, sisa anggaran. Penilainya tidak diulang di sini karena sudah tampil di pilihan
 * tepat di atas tabel. Biaya memakai formatRupiah seperti ringkasan pengukuran (PBI-11); sisa anggaran
 * dibulatkan ke bawah (keputusan PO, 3 Nov) supaya angka yang tampil tidak pernah lebih besar dari
 * sisa sebenarnya. activeVersion hanya true bila server sendiri yang memilih versi aktif (C2).
 */
export function toEstimateView(estimate: GradeEstimate, { activeVersion = false }: Readonly<{ activeVersion?: boolean }> = {}): EstimateView {
  const version = versionText(estimate.rubric_version);
  return {
    rows: [
      { label: "Versi rubrik", value: activeVersion ? `${version} · aktif` : version },
      { label: "Jumlah percobaan", value: String(estimate.attempts_to_grade) },
      { label: "Perkiraan biaya", value: formatRupiah(estimate.estimated_cost_idr) },
      { label: "Sisa anggaran bulanan penilai", value: formatRupiahDown(estimate.remaining_budget_idr) },
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
  return resource.status === "ready" && resource.data?.budgetSufficient === true;
}
