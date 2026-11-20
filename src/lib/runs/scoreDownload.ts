import { isReasonWritten } from "@/lib/runs/sessionAccept";
import type { SessionDetail, SessionStatus } from "@/types/measurement";

/**
 * Kalimat di samping tombol Unduh skor (PBI-16 AC6, SCRUM-329).
 * Sesi yang tidak disebut di AC6 tetap tidak bisa diunduh; kalimatnya memakai
 * penjelasan yang sudah ada, bukan status layak yang baru.
 */
export const SCORE_DOWNLOAD_REASON = {
  inProgress: "Sesi masih berjalan.",
  resume: "Lanjutkan sampai selesai.",
  notAccepted: "Belum diterima apa adanya.",
  notGraded: "Sesi ini belum dinilai.",
} as const;

/** Hasil penilaian terbaru: belum diketahui, kosong, atau ada. */
export type ScoreGrading = "unknown" | "graded" | "ungraded";

export type ScoreDownloadSession = Pick<
  SessionDetail,
  "status" | "session_type" | "accepted_as_is_at" | "accepted_as_is_reason"
>;

export type ScoreDownloadDecision = { eligible: true } | { eligible: false; reason: string | null };

const BLOCKED: Record<SessionStatus, string> = {
  queued: SCORE_DOWNLOAD_REASON.inProgress,
  running: SCORE_DOWNLOAD_REASON.inProgress,
  paused: SCORE_DOWNLOAD_REASON.resume,
  cancelled: SCORE_DOWNLOAD_REASON.resume,
  finished: SCORE_DOWNLOAD_REASON.notGraded,
  finished_with_failures: SCORE_DOWNLOAD_REASON.notAccepted,
  failed: SCORE_DOWNLOAD_REASON.notGraded,
  not_filled: SCORE_DOWNLOAD_REASON.inProgress,
  partially_filled: SCORE_DOWNLOAD_REASON.inProgress,
  complete: SCORE_DOWNLOAD_REASON.notGraded,
  graded: SCORE_DOWNLOAD_REASON.notGraded,
  finalized: SCORE_DOWNLOAD_REASON.notGraded,
};

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

/**
 * Siapa yang boleh mengunduh tidak diputuskan di sini. Halaman sesi yang sudah
 * menampilkan sesi ini juga menampilkan tombolnya. SCRUM-327 yang menolak unduhan
 * bila perannya tidak berhak.
 */
export function scoreDownloadDecision(session: ScoreDownloadSession, grading: ScoreGrading): ScoreDownloadDecision {
  if (acceptedAsIs(session)) return { eligible: true };
  if (session.status === "finished" && grading === "graded") return { eligible: true };
  // Jangan menuduh sesi selesai "belum dinilai" selagi hasilnya masih dimuat.
  if (session.status === "finished" && grading === "unknown") return { eligible: false, reason: null };
  return { eligible: false, reason: BLOCKED[session.status] };
}
