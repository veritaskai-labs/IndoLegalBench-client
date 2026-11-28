import { ApiError } from "@/lib/apiClient";
import { DEFAULT_LOCALE, fill, messages, text, type Locale } from "@/lib/i18n/locale";
import type { CallAttemptLog } from "@/types/measurement";

const DETIK = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const TRY_LABEL = messages({
  id: {
    attempt: "Upaya ke-{n}",
    retry: "Upaya ke-{n} (coba ulang)",
  },
  en: {
    attempt: "Attempt {n}",
    retry: "Attempt {n} (retry)",
  },
});

const SECONDS = messages({
  id: "{seconds} detik",
  en: "{seconds} seconds",
});

const RESULT_OK = messages({
  id: "Berhasil",
  en: "Succeeded",
});

const MASKED = messages({
  id: "Isi mentah disembunyikan. Hanya jenis kegagalan dan waktunya yang bisa ditampilkan.",
  en: "The raw content is hidden. Only the failure kind and its time can be shown.",
});

const CALL_ERRORS = messages({
  id: {
    load: "Gagal memuat detail teknis. Coba lagi.",
    attempt: "Percobaan ini tidak ada di sesi tersebut.",
    session: "Sesi tidak ditemukan.",
  },
  en: {
    load: "Could not load the technical detail. Try again.",
    attempt: "This attempt is not in that session.",
    session: "Session not found.",
  },
});

const EMPTY_CALLS = messages({
  id: "Belum ada upaya panggilan yang tercatat.",
  en: "No call attempts are recorded yet.",
});

export function tryLabel(
  call: Pick<CallAttemptLog, "try_no" | "is_manual_retry">,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const copy = text(TRY_LABEL, locale);
  return fill(call.is_manual_retry ? copy.retry : copy.attempt, { n: call.try_no });
}

export function durationText(ms: number, locale: Locale = DEFAULT_LOCALE): string {
  if (!Number.isFinite(ms) || ms < 0) return "–";

  if (ms < 1000) return `${Math.round(ms)} ms`;

  return fill(text(SECONDS, locale), { seconds: DETIK.format(ms / 1000) });
}

export function callResultText(
  call: Pick<CallAttemptLog, "result" | "failure_kind">,
  locale: Locale = DEFAULT_LOCALE,
): string {
  if (call.result === "ok") return text(RESULT_OK, locale);

  return call.failure_kind ?? call.result;
}

export function callErrorText(
  call: Pick<CallAttemptLog, "error_summary">
): string | null {
  const message = call.error_summary?.trim();

  return message === undefined || message === ""
    ? null
    : message;
}

export function rawResponseText(
  raw: CallAttemptLog["raw_response"]
): string | null {
  if (raw === null || raw === undefined) return null;

  try {
    return JSON.stringify(raw, null, 2) ?? null;
  } catch {
    return null;
  }
}


export function maskedNotice(locale: Locale = DEFAULT_LOCALE): string {
  return text(MASKED, locale);
}

export function emptyCallsText(locale: Locale = DEFAULT_LOCALE): string {
  return text(EMPTY_CALLS, locale);
}

export function mapCallDetailError(error: unknown, locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(CALL_ERRORS, locale);
  if (!(error instanceof ApiError)) return copy.load;
  if (error.code === "ATTEMPT_NOT_FOUND") return copy.attempt;
  if (error.code === "MEASUREMENT_NOT_FOUND") return copy.session;
  return copy.load;
}