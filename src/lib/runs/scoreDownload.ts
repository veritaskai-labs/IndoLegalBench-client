import { isReasonWritten } from "@/lib/runs/sessionAccept";
import type { SessionDetail, SessionStatus } from "@/types/measurement";

/**
 * Kalimat di samping tombol Unduh skor (PBI-16 AC6, SCRUM-329).
 * Kelayakan mengikuti D2: sesi yang sudah ditutup dan sudah dinilai.
 * Status lain tetap tidak bisa diunduh, dengan kalimat yang sudah ada.
 */
export const SCORE_DOWNLOAD_REASON = {
  inProgress: "Sesi masih berjalan.",
  resume: "Lanjutkan sampai selesai.",
  notAccepted: "Belum diterima apa adanya.",
  notGraded: "Sesi ini belum dinilai.",
  archived: "Sesi ini sudah diarsipkan, jadi berkas skornya tidak bisa diunduh.",
} as const;

/** Hasil penilaian terbaru: belum diketahui, kosong, atau ada. */
export type ScoreGrading = "unknown" | "graded" | "ungraded";

export type ScoreDownloadSession = Pick<
  SessionDetail,
  "status" | "session_type" | "accepted_as_is_at" | "accepted_as_is_reason"
> & { archived_at?: string | null };

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
export function scoreDownloadDecision(session: ScoreDownloadSession, grading: ScoreGrading): ScoreDownloadDecision {
  if (typeof session.archived_at === "string" && session.archived_at !== "") {
    return { eligible: false, reason: SCORE_DOWNLOAD_REASON.archived };
  }
  if (!closedForReport(session)) return { eligible: false, reason: BLOCKED[session.status] };
  if (grading === "graded") return { eligible: true };
  // Jangan menuduh sesi yang sudah ditutup "belum dinilai" selagi hasilnya masih dimuat.
  if (grading === "unknown") return { eligible: false, reason: null };
  return { eligible: false, reason: SCORE_DOWNLOAD_REASON.notGraded };
}
