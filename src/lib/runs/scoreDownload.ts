import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";
import { isReasonWritten } from "@/lib/runs/sessionAccept";
import type { SessionDetail, SessionStatus } from "@/types/measurement";

/**
 * Kalimat di samping tombol Unduh skor (PBI-16 AC6, SCRUM-329).
 * Sama dengan kalimat 409 unduhan di server, satu kode per status.
 * The exported object stays the Indonesian sentences existing callers already compare.
 */
const SCORE_DOWNLOAD_TEXT = messages({
  id: {
    notFinished: "Sesi ini belum selesai, jadi berkas skornya belum bisa diunduh. Tunggu sampai sesi selesai.",
    cancelled: "Sesi ini dibatalkan, jadi berkas skornya belum bisa diunduh. Lanjutkan sesi sampai selesai dulu.",
    runFailed: "Proses run sesi ini gagal, jadi tidak ada skor yang bisa diunduh. Buat sesi baru.",
    notAccepted:
      "Sesi ini selesai dengan kegagalan dan belum diterima apa adanya oleh Admin, jadi berkas skornya belum bisa diunduh.",
    notGraded: "Sesi ini belum dinilai, jadi berkas skornya belum bisa diunduh.",
    archived: "Sesi ini sudah diarsipkan, jadi berkas skornya tidak bisa diunduh.",
  },
  en: {
    notFinished: "This session is not finished, so its score file cannot be downloaded yet. Wait until the session finishes.",
    cancelled: "This session was cancelled, so its score file cannot be downloaded yet. Resume the session and finish it first.",
    runFailed: "This session's run failed, so there is no score to download. Create a new session.",
    notAccepted:
      "This session finished with failures and has not been accepted as-is by an Admin, so its score file cannot be downloaded yet.",
    notGraded: "This session has not been graded, so its score file cannot be downloaded yet.",
    archived: "This session is archived, so its score file cannot be downloaded.",
  },
});

export const SCORE_DOWNLOAD_REASON = SCORE_DOWNLOAD_TEXT.id;

/** Hasil penilaian terbaru: belum diketahui, kosong, atau ada. */
export type ScoreGrading = "unknown" | "graded" | "ungraded";

export type ScoreDownloadSession = Pick<
  SessionDetail,
  "status" | "session_type" | "accepted_as_is_at" | "accepted_as_is_reason"
> & { archived_at?: string | null };

export type ScoreDownloadDecision = { eligible: true } | { eligible: false; reason: string | null };

/** Status yang belum layak. finished dan finalized ditangani setelahnya, karena keduanya layak begitu dinilai. */
function blockedReason(status: SessionStatus, locale: Locale): string {
  const reason = text(SCORE_DOWNLOAD_TEXT, locale);
  const blocked: Record<SessionStatus, string> = {
    queued: reason.notFinished,
    running: reason.notFinished,
    paused: reason.notFinished,
    cancelled: reason.cancelled,
    finished: reason.notGraded,
    finished_with_failures: reason.notAccepted,
    failed: reason.runFailed,
    not_filled: reason.notFinished,
    partially_filled: reason.notFinished,
    complete: reason.notFinished,
    graded: reason.notFinished,
    finalized: reason.notGraded,
  };
  return blocked[status];
}

/** D2: selesai (otomatis) atau Selesai (manual). Dinilai belum selesai. */
const CLOSED: ReadonlySet<SessionStatus> = new Set(["finished", "finalized"]);

/** AC6: sesi otomatis yang diterima apa adanya, dengan alasan yang bisa dibaca. */
function acceptedAsIs(session: ScoreDownloadSession): boolean {
  return (
    session.session_type === "automatic" &&
    session.status === "finished_with_failures" &&
    session.accepted_as_is_at !== null &&
    session.accepted_as_is_reason !== null &&
    isReasonWritten(session.accepted_as_is_reason)
  );
}

/** Status yang boleh diunduh setelah ada hasil penilaian (D2). Arsip tidak pernah. */
function closedForReport(session: ScoreDownloadSession): boolean {
  return CLOSED.has(session.status) || acceptedAsIs(session);
}

/**
 * Siapa yang boleh mengunduh tidak diputuskan di sini. Halaman sesi yang sudah
 * menampilkan sesi ini juga menampilkan tombolnya. Server menolak unduhan bila
 * perannya tidak boleh melihat kasusnya.
 */
export function scoreDownloadDecision(
  session: ScoreDownloadSession,
  grading: ScoreGrading,
  locale: Locale = DEFAULT_LOCALE,
): ScoreDownloadDecision {
  const reason = text(SCORE_DOWNLOAD_TEXT, locale);
  if (typeof session.archived_at === "string" && session.archived_at !== "") {
    return { eligible: false, reason: reason.archived };
  }
  if (!closedForReport(session)) return { eligible: false, reason: blockedReason(session.status, locale) };
  if (grading === "graded") return { eligible: true };
  // Jangan menuduh sesi yang sudah ditutup "belum dinilai" selagi hasilnya masih dimuat.
  if (grading === "unknown") return { eligible: false, reason: null };
  return { eligible: false, reason: reason.notGraded };
}
