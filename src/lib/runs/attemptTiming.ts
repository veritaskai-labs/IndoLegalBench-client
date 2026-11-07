import { formatWib } from "@/lib/datetime/formatWib";

export type AttemptTiming = { started: string; finished: string; duration: string | null };

type AttemptStamps = { started_at: string | null; finished_at: string | null };

/**
 * Teks waktu mulai, selesai, dan lama panggilan satu percobaan (PBI-11 AC8).
 * Server mengirim keduanya sebagai ISO UTC dan null untuk data lama, percobaan yang belum jalan,
 * atau percobaan yang dibuka lagi lewat coba ulang; tampilan ke WIB dikerjakan di sini.
 */
export function describeAttemptTiming(attempt: AttemptStamps): AttemptTiming {
  return {
    started: attempt.started_at === null ? "Belum dimulai" : formatWib(attempt.started_at),
    finished: attempt.finished_at === null ? "Belum selesai" : formatWib(attempt.finished_at),
    duration: formatDuration(attempt.started_at, attempt.finished_at),
  };
}

/** Lama panggilan, atau null bila salah satu waktu kosong, bukan tanggal, atau selesai sebelum mulai. */
function formatDuration(startedAt: string | null, finishedAt: string | null): string | null {
  if (startedAt === null || finishedAt === null) return null;

  const elapsedMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
  if (Number.isNaN(elapsedMs) || elapsedMs < 0) return null;

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} dtk`;
  return seconds === 0 ? `${minutes} mnt` : `${minutes} mnt ${seconds} dtk`;
}
