import { DEFAULT_LOCALE, fill, messages, text, type Locale } from "@/lib/i18n/locale";
import type { AttemptResult, AttemptStatus, CaseFilter, MeasurementPurpose, SessionCaseResult } from "@/types/measurement";

/** Status satu percobaan (D2 attempts). Record atas enum kontrak: status baru membuat tsc gagal di sini. */
const ATTEMPT_STATUS_TEXT = messages<Record<AttemptStatus, string>>({
  id: {
    pending: "Menunggu",
    running: "Berjalan",
    succeeded: "Berhasil",
    technical_failure: "Gagal teknis",
  },
  en: {
    pending: "Waiting",
    running: "Running",
    succeeded: "Succeeded",
    technical_failure: "Technical failure",
  },
});

export const ATTEMPT_STATUS_LABEL: Record<AttemptStatus, string> = ATTEMPT_STATUS_TEXT.id;

export function attemptStatusLabel(status: AttemptStatus, locale: Locale = DEFAULT_LOCALE): string {
  return text(ATTEMPT_STATUS_TEXT, locale)[status];
}

/** Kata yang sama dengan halaman Buat pengukuran (SCRUM-211), supaya satu sesi terbaca sama di kedua halaman. */
const PURPOSE_TEXT = messages<Record<MeasurementPurpose, string>>({
  id: {
    official: "Pengukuran Resmi",
    trial: "Uji Coba",
  },
  en: {
    official: "Official measurement",
    trial: "Trial",
  },
});

export const MEASUREMENT_PURPOSE_LABEL: Record<MeasurementPurpose, string> = PURPOSE_TEXT.id;

export function measurementPurposeLabel(purpose: MeasurementPurpose, locale: Locale = DEFAULT_LOCALE): string {
  return text(PURPOSE_TEXT, locale)[purpose];
}

const FILTER_TEXT = messages<Record<CaseFilter, string>>({
  id: {
    both: "Semua (Dev & Test)",
    dev: "Hanya Dev",
    test: "Hanya Test",
  },
  en: {
    both: "All (Dev & Test)",
    dev: "Dev only",
    test: "Test only",
  },
});

export const CASE_FILTER_LABEL: Record<CaseFilter, string> = FILTER_TEXT.id;

export function caseFilterLabel(filter: CaseFilter, locale: Locale = DEFAULT_LOCALE): string {
  return text(FILTER_TEXT, locale)[filter];
}

const ATTEMPT_SUMMARY = messages({
  id: {
    none: "Belum ada percobaan",
    base: "{succeeded} dari {total} berhasil",
    failed: "{base} · {failed} gagal teknis",
  },
  en: {
    none: "No attempts yet",
    base: "{succeeded} of {total} succeeded",
    failed: "{base} · {failed} technical failures",
  },
});

const PLACEHOLDER = messages({
  id: {
    masked: "Isi kasus test disembunyikan untuk Developer AI.",
    waiting: "Belum ada jawaban.",
    failed: "Gagal teknis, tidak ada jawaban.",
    missing: "Tidak ada jawaban tersimpan.",
    empty: "Produk mengirim jawaban kosong.",
  },
  en: {
    masked: "Test-case content is hidden from Developer AI.",
    waiting: "No answer yet.",
    failed: "Technical failure, no answer.",
    missing: "No stored answer.",
    empty: "The product sent an empty answer.",
  },
});

/** Urut nomor percobaan tanpa mengubah array asal. Nomor yang bolong tetap bolong. */
export function sortedAttempts(attempts: readonly AttemptResult[]): AttemptResult[] {
  return [...attempts].sort((a, b) => a.repetition_no - b.repetition_no);
}

/** "2 dari 3 berhasil · 1 gagal teknis". */
export function attemptSummary(attempts: readonly AttemptResult[], locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(ATTEMPT_SUMMARY, locale);
  if (attempts.length === 0) return copy.none;
  const succeeded = attempts.filter((a) => a.status === "succeeded").length;
  const failed = attempts.filter((a) => a.status === "technical_failure").length;
  const base = fill(copy.base, { succeeded, total: attempts.length });
  return failed > 0 ? fill(copy.failed, { base, failed }) : base;
}

/** Hanya masked yang menentukan teks pengganti; Developer AI dan Admin membaca jawaban dev dengan cara yang sama. */
export type AnswerContext = { masked: boolean };

/**
 * Server (#91 session_detail) mengirim answer_text null karena beberapa alasan tanpa menyebut
 * alasannya, jadi teks penggantinya disimpulkan dari konteks. null: ada jawaban untuk ditampilkan
 * (string kosong juga jawaban asli dari produk).
 */
export function answerPlaceholder(attempt: AttemptResult, context: AnswerContext, locale: Locale = DEFAULT_LOCALE): string | null {
  if (attempt.answer_text !== null) return null;
  const copy = text(PLACEHOLDER, locale);
  if (context.masked) return copy.masked;
  if (attempt.status === "pending" || attempt.status === "running") return copy.waiting;
  if (attempt.status === "technical_failure") return copy.failed;
  return copy.missing;
}

/** Jawaban string kosong adalah jawaban asli, dengan kalimat chrome di sekelilingnya. */
export function emptyAnswerText(locale: Locale = DEFAULT_LOCALE): string {
  return text(PLACEHOLDER, locale).empty;
}

/**
 * Belum ada satu pun jawaban yang bisa dibaca dan masih ada percobaan yang akan menjawab (PBI-11
 * AC9, state empty). Kasus yang disamarkan tidak dihitung: isinya tidak akan pernah tampil. Kalau
 * semua percobaan sudah berakhir tanpa jawaban (mis. gagal teknis), tidak ada yang ditunggu.
 */
export function awaitingFirstAnswer(cases: readonly SessionCaseResult[]): boolean {
  const attempts = cases.filter((item) => !item.masked).flatMap((item) => item.attempts);
  return (
    attempts.length > 0 &&
    attempts.every((attempt) => attempt.answer_text === null) &&
    attempts.some((attempt) => attempt.status === "pending" || attempt.status === "running")
  );
}
