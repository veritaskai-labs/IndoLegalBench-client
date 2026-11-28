import { DEFAULT_LOCALE, fill, messages, text, type Locale } from "@/lib/i18n/locale";
import type { SessionCaseResult, AttemptResult } from "@/types/measurement";

const COUNT = new Intl.NumberFormat("id-ID");

const SUMMARY = messages({
  id: {
    none: "Tidak ada panggilan yang gagal",
    some: "{count} panggilan gagal karena masalah teknis",
  },
  en: {
    none: "No calls failed",
    some: "{count} calls failed because of a technical problem",
  },
});

const VERSION_MISSING = messages({
  id: "Tidak tercatat",
  en: "Not recorded",
});

/** Satu panggilan yang gagal teknis, sudah dirangkai dengan kasus asalnya. */
export type FailedAttempt = {
  key: string;
  caseCode: string;
  title: string;
  repetitionNo: number;
  modelVersion: string | null;
  attemptId: string | null;
};


/** ID percobaan dari kontrak OpenAPI SCRUM-218. */
export function attemptIdOf(
  attempt: AttemptResult
): string {
  return attempt.id;
}


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
        attemptId: attemptIdOf(attempt),
      })),
  );
}

/** Ringkasan sederhana di atas tombol detail teknis. */
export function errorSummaryText(count: number, locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(SUMMARY, locale);
  if (count === 0) return copy.none;
  return fill(copy.some, { count: COUNT.format(count) });
}

/** model_version null: produk menjawab tanpa menyebut versinya, atau gagal sebelum sempat. */
export function modelVersionText(modelVersion: string | null, locale: Locale = DEFAULT_LOCALE): string {
  return modelVersion ?? text(VERSION_MISSING, locale);
}