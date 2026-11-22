import type { ScoreScope, TrendMetric, TrendRange } from "@/types/reports";

/** Pilihan metrik (PBI-17 AC3). Ditulis sebagai tabel supaya metrik baru cukup satu baris. */
export const TREND_METRIC_LABEL: Readonly<Record<TrendMetric, string>> = {
  total: "Skor total",
  deterministic: "Deterministik",
  llm: "Penilai LLM",
};

/** Pilihan rentang waktu (PBI-17 AC2). */
export const TREND_RANGE_LABEL: Readonly<Record<TrendRange, string>> = {
  "3m": "3 bulan",
  "6m": "6 bulan",
  "12m": "12 bulan",
  all: "Semua",
};

/** Jenis kasus pada tren memakai nama All, Test only, Dev only (PBI-17 AC12), bukan nama di daftar laporan. */
export const TREND_SCOPE_LABEL: Readonly<Record<ScoreScope, string>> = {
  test: "Test only",
  dev: "Dev only",
  dev_test: "All",
};

/** Alasan garis diputus (PBI-17 AC5), kode dari server. Kode baru cukup ditambah di sini. */
const BREAK_LABEL: Readonly<Record<string, string>> = {
  RUBRIC_VERSION: "Versi rubrik penilaian berbeda",
  JUDGE_MODEL: "Model penilai berbeda",
  SUITE_VERSION: "Versi suite atau kasus berbeda",
  MODEL_VERSION_DIFFERS: "Versi model produk berbeda",
};

/** Penanda titik (PBI-17 AC5). */
const MARKER_LABEL: Readonly<Record<string, string>> = {
  REPETITIONS_DIFFER: "Jumlah percobaan berbeda",
  TRIAL_SESSION: "Sesi percobaan",
  MANUAL_ANSWER_RANGE_OVER_LIMIT: "Rentang jawaban manual melewati batas",
};

/** Peringatan tren (PBI-17 AC11). */
const WARNING_LABEL: Readonly<Record<string, string>> = {
  NO_SHARED_CASES: "Tidak ada kasus yang sama antar sesi, jadi garis tren tidak digambar.",
};

/**
 * Kode dari server bisa bertambah sebelum halaman ini diperbarui. Kode yang belum dikenal memakai kalimat umum,
 * bukan kodenya, supaya pembaca tidak melihat teks teknis dan halaman tidak rusak.
 */
export function breakLabel(code: string): string {
  return BREAK_LABEL[code] ?? "Data pembanding berbeda";
}

export function markerLabel(code: string): string {
  return MARKER_LABEL[code] ?? "Penanda tambahan";
}

export function warningLabel(code: string): string {
  return WARNING_LABEL[code] ?? "Ada peringatan pada data tren ini.";
}
