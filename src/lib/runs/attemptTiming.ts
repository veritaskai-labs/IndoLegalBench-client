import { formatWib } from "@/lib/datetime/formatWib";
import { DEFAULT_LOCALE, fill, messages, text, type Locale } from "@/lib/i18n/locale";

const TIMING = messages({
  id: {
    notStarted: "Belum dimulai",
    notFinished: "Belum selesai",
    seconds: "{seconds} dtk",
    minutes: "{minutes} mnt",
    both: "{minutes} mnt {seconds} dtk",
  },
  en: {
    notStarted: "Not started",
    notFinished: "Not finished",
    seconds: "{seconds} sec",
    minutes: "{minutes} min",
    both: "{minutes} min {seconds} sec",
  },
});

export type AttemptTiming = { started: string; finished: string; duration: string | null };

type AttemptStamps = { started_at: string | null; finished_at: string | null };

/**
 * Teks waktu mulai, selesai, dan lama panggilan satu percobaan (PBI-11 AC8).
 * Server mengirim keduanya sebagai ISO UTC dan null untuk data lama, percobaan yang belum jalan,
 * atau percobaan yang dibuka lagi lewat coba ulang; tampilan ke WIB dikerjakan di sini.
 */
export function describeAttemptTiming(attempt: AttemptStamps, locale: Locale = DEFAULT_LOCALE): AttemptTiming {
  const copy = text(TIMING, locale);
  return {
    started: attempt.started_at === null ? copy.notStarted : formatWib(attempt.started_at),
    finished: attempt.finished_at === null ? copy.notFinished : formatWib(attempt.finished_at),
    duration: formatDuration(attempt.started_at, attempt.finished_at, locale),
  };
}

/** Lama panggilan, atau null bila salah satu waktu kosong, bukan tanggal, atau selesai sebelum mulai. */
function formatDuration(startedAt: string | null, finishedAt: string | null, locale: Locale): string | null {
  if (startedAt === null || finishedAt === null) return null;

  const elapsedMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (Number.isNaN(elapsedMs) || elapsedMs < 0) return null;

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const copy = text(TIMING, locale);
  if (minutes === 0) return fill(copy.seconds, { seconds });
  return seconds === 0 ? fill(copy.minutes, { minutes }) : fill(copy.both, { minutes, seconds });
}
