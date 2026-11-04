import type { SessionCaseResult } from "@/types/measurement";

const COUNT = new Intl.NumberFormat("id-ID");

/** Satu panggilan yang gagal teknis, sudah dirangkai dengan kasus asalnya. */
export type FailedAttempt = {
  key: string;
  caseCode: string;
  title: string;
  repetitionNo: number;
  modelVersion: string | null;
};

/**
 * Panggilan yang gagal teknis dari seluruh kasus sesi (PBI-12 AC4). Urutan kasus dibiarkan
 * seperti yang dikirim server; nomor pengulangan diurutkan di dalam kasusnya. filter() sudah
 * membuat array baru, jadi sort() tidak menyentuh data milik pemanggil.
 */
export function failedAttempts(cases: readonly SessionCaseResult[]): FailedAttempt[] {
  return cases.flatMap((kasus) =>
    kasus.attempts
      .filter((attempt) => attempt.status === "technical_failure")
      .sort((a, b) => a.repetition_no - b.repetition_no)
      .map((attempt) => ({
        key: `${kasus.snapshot_item_id}-${attempt.repetition_no}`,
        caseCode: kasus.case_code,
        title: kasus.title,
        repetitionNo: attempt.repetition_no,
        modelVersion: attempt.model_version,
      })),
  );
}

/** Ringkasan sederhana di atas tombol detail teknis. */
export function errorSummaryText(count: number): string {
  if (count === 0) return "Tidak ada panggilan yang gagal";
  return `${COUNT.format(count)} panggilan gagal karena masalah teknis`;
}

/** model_version null: produk menjawab tanpa menyebut versinya, atau gagal sebelum sempat. */
export function modelVersionText(modelVersion: string | null): string {
  return modelVersion ?? "Tidak tercatat";
}