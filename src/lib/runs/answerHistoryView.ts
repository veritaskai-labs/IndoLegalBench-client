import { formatWib } from "@/lib/datetime/formatWib";
import { DEFAULT_LOCALE, fill, messages, text, type Locale } from "@/lib/i18n/locale";
import type { ManualAnswerHistoryEntry } from "@/types/measurement";

const ACTOR = messages({
  id: {
    unknown: "Tidak diketahui",
    you: "Anda",
    other: "Anggota lain",
  },
  en: {
    unknown: "Unknown",
    you: "You",
    other: "Someone else",
  },
});

const VERSION_TITLE = messages({
  id: "Versi {n}",
  en: "Version {n}",
});

/** Satu versi jawaban lama, siap ditampilkan di dialog Riwayat (AC5). */
export type HistoryVersion = {
  key: string;
  title: string;
  filledBy: string;
  filledAt: string;
  obtainedAt: string | null;
  overwrittenBy: string;
  overwrittenAt: string;
  refused: boolean;
  note: string | null;
  answerMd: string | null;
};

/**
 * Kontrak riwayat hanya mengirim id pengguna, jadi yang bisa dibedakan adalah "Anda" dan orang lain.
 * Nama pengisi butuh perubahan kontrak di server.
 */
export function actorLabel(
  actorId: string | null,
  currentUserId: string | null,
  locale: Locale = DEFAULT_LOCALE,
): string {
  const copy = text(ACTOR, locale);
  if (actorId === null) return copy.unknown;
  return actorId === currentUserId ? copy.you : copy.other;
}

/** Urutan dari server (terlama dulu) dipertahankan; nomor versi mengikutinya. */
export function toHistoryVersions(
  entries: readonly ManualAnswerHistoryEntry[],
  currentUserId: string | null,
  locale: Locale = DEFAULT_LOCALE,
): HistoryVersion[] {
  return entries.map((entry, index) => ({
    key: entry.id,
    title: fill(text(VERSION_TITLE, locale), { n: index + 1 }),
    filledBy: actorLabel(entry.filled_by, currentUserId, locale),
    filledAt: formatWib(entry.filled_at),
    obtainedAt: entry.obtained_at ? formatWib(entry.obtained_at) : null,
    overwrittenBy: actorLabel(entry.overwritten_by, currentUserId, locale),
    overwrittenAt: formatWib(entry.overwritten_at),
    refused: entry.platform_refused,
    note: entry.note,
    answerMd: entry.answer_md,
  }));
}
