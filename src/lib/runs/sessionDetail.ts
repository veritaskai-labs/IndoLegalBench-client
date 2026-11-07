import type { AttemptResult, AttemptStatus, CaseFilter, MeasurementPurpose, SessionCaseResult } from "@/types/measurement";

/** Status satu percobaan (D2 attempts). Record atas enum kontrak: status baru membuat tsc gagal di sini. */
export const ATTEMPT_STATUS_LABEL: Record<AttemptStatus, string> = {
  pending: "Menunggu",
  running: "Berjalan",
  succeeded: "Berhasil",
  technical_failure: "Gagal teknis",
};

/** Kata yang sama dengan halaman Buat pengukuran (SCRUM-211), supaya satu sesi terbaca sama di kedua halaman. */
export const MEASUREMENT_PURPOSE_LABEL: Record<MeasurementPurpose, string> = {
  official: "Pengukuran Resmi",
  trial: "Uji Coba",
};

export const CASE_FILTER_LABEL: Record<CaseFilter, string> = {
  both: "Semua (Dev & Test)",
  dev: "Hanya Dev",
  test: "Hanya Test",
};

/** Urut nomor percobaan tanpa mengubah array asal. Nomor yang bolong tetap bolong. */
export function sortedAttempts(attempts: readonly AttemptResult[]): AttemptResult[] {
  return [...attempts].sort((a, b) => a.repetition_no - b.repetition_no);
}

/** "2 dari 3 berhasil · 1 gagal teknis". */
export function attemptSummary(attempts: readonly AttemptResult[]): string {
  if (attempts.length === 0) return "Belum ada percobaan";
  const succeeded = attempts.filter((a) => a.status === "succeeded").length;
  const failed = attempts.filter((a) => a.status === "technical_failure").length;
  const base = `${succeeded} dari ${attempts.length} berhasil`;
  return failed > 0 ? `${base} · ${failed} gagal teknis` : base;
}

/** Hanya masked yang menentukan teks pengganti; Developer AI dan Admin membaca jawaban dev dengan cara yang sama. */
export type AnswerContext = { masked: boolean };

/**
 * Server (#91 session_detail) mengirim answer_text null karena beberapa alasan tanpa menyebut
 * alasannya, jadi teks penggantinya disimpulkan dari konteks. null: ada jawaban untuk ditampilkan
 * (string kosong juga jawaban asli dari produk).
 */
export function answerPlaceholder(attempt: AttemptResult, context: AnswerContext): string | null {
  if (attempt.answer_text !== null) return null;
  if (context.masked) return "Isi kasus test disembunyikan untuk Developer AI.";
  if (attempt.status === "pending" || attempt.status === "running") return "Belum ada jawaban.";
  if (attempt.status === "technical_failure") return "Gagal teknis, tidak ada jawaban.";
  return "Tidak ada jawaban tersimpan.";
}

// Kerangka untuk commit red.
export function awaitingFirstAnswer(cases: readonly SessionCaseResult[]): boolean {
  void cases;
  return false;
}
