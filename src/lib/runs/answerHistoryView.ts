import { formatWib } from "@/lib/datetime/formatWib";
import type { ManualAnswerHistoryEntry } from "@/types/measurement";

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
export function actorLabel(actorId: string | null, currentUserId: string | null): string {
  if (actorId === null) return "Tidak diketahui";
  return actorId === currentUserId ? "Anda" : "Anggota lain";
}

/** Urutan dari server (terlama dulu) dipertahankan; nomor versi mengikutinya. */
export function toHistoryVersions(
  entries: readonly ManualAnswerHistoryEntry[],
  currentUserId: string | null,
): HistoryVersion[] {
  return entries.map((entry, index) => ({
    key: entry.id,
    title: `Versi ${index + 1}`,
    filledBy: actorLabel(entry.filled_by, currentUserId),
    filledAt: formatWib(entry.filled_at),
    obtainedAt: entry.obtained_at ? formatWib(entry.obtained_at) : null,
    overwrittenBy: actorLabel(entry.overwritten_by, currentUserId),
    overwrittenAt: formatWib(entry.overwritten_at),
    refused: entry.platform_refused,
    note: entry.note,
    answerMd: entry.answer_md,
  }));
}
