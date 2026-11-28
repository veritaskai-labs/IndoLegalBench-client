import { ApiError } from "@/lib/apiClient";
import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";
import type { Me, Role } from "@/types";
import type { RetrySelection } from "@/lib/runs/sessionControlApi";
import type { AttemptStatus, SessionCaseResult, SessionDetail, SessionStatus } from "@/types/measurement";

type ControlState = Pick<SessionDetail, "status" | "archived_at" | "resume_error_code">;

/**
 * Tombol Jeda, Batalkan dan Lanjutkan hanya untuk yang akan diterima server (PBI-12 AC7, AC8,
 * server#102). Server mengizinkan Developer AI mengontrol sesinya sendiri hanya bila flag
 * MEASUREMENT_DEV_AI_CONTROLS_ENABLED aktif, dan client tidak bisa melihat flag itu; jadi tombol
 * mengikuti bawaan server, yaitu Admin saja. Server tetap yang menolak (403/409).
 */
function controllable(session: ControlState, role: Role | null, from: ReadonlySet<SessionStatus>): boolean {
  return role === "admin" && session.archived_at === null && from.has(session.status);
}

// Asal yang sah per tujuan, sama dengan ALLOWED_TRANSITIONS di server (session_transitions).
const PAUSE_FROM: ReadonlySet<SessionStatus> = new Set(["running"]);
const CANCEL_FROM: ReadonlySet<SessionStatus> = new Set(["queued", "running", "paused"]);
const RESUME_FROM: ReadonlySet<SessionStatus> = new Set(["paused", "cancelled"]);

export function canPause(session: ControlState, role: Role | null): boolean {
  return controllable(session, role, PAUSE_FROM);
}

export function canCancel(session: ControlState, role: Role | null): boolean {
  return controllable(session, role, CANCEL_FROM);
}

/** Setelah versi model berubah, server menolak setiap Lanjutkan; sesi harus diganti sesi baru (AC8). */
export function canResume(session: ControlState, role: Role | null): boolean {
  return controllable(session, role, RESUME_FROM) && session.resume_error_code === null;
}

type RetryCase = { attempts: ReadonlyArray<{ status: AttemptStatus }> };
type RetryState = Pick<SessionDetail, "status" | "archived_at" | "accepted_as_is_at" | "created_by"> & {
  cases: ReadonlyArray<RetryCase>;
};

/** Percobaan yang gagal teknis: hanya itu yang bisa dicoba ulang (AC3, server#99 ATTEMPT_NOT_RETRYABLE). */
export function failedAttemptCount(cases: ReadonlyArray<RetryCase>): number {
  return cases.reduce((total, item) => total + item.attempts.filter((attempt) => attempt.status === "technical_failure").length, 0);
}

/**
 * Coba ulang yang gagal (AC3): sesi Selesai dengan kegagalan yang belum diterima apa adanya, belum
 * diarsipkan, dan masih punya percobaan gagal. Berbeda dengan Jeda/Batalkan, server#99 juga
 * mengizinkan Developer AI pada sesi yang ia buat (403 NOT_YOUR_SESSION untuk sesi orang lain).
 */
export function canRetry(session: RetryState, me: Pick<Me, "id" | "role"> | null): boolean {
  if (me === null) return false;
  const allowed = me.role === "admin" || (me.role === "developer_ai" && session.created_by === me.id);
  return (
    allowed &&
    session.status === "finished_with_failures" &&
    session.archived_at === null &&
    session.accepted_as_is_at === null &&
    failedAttemptCount(session.cases) > 0
  );
}

/** Satu baris checkbox di dialog Coba ulang: satu kasus dengan percobaan yang gagal (AC3). */
export type FailedCase = { key: string; label: string; attemptIds: string[] };

type CaseRow = Pick<SessionCaseResult, "snapshot_item_id" | "case_code" | "title" | "masked"> & {
  attempts: ReadonlyArray<{ id: string; status: AttemptStatus }>;
};

/** Kasus yang punya percobaan gagal, urutan sama dengan detail sesi. Kasus tersamar memakai judul samarannya. */
export function failedCases(cases: ReadonlyArray<CaseRow>): FailedCase[] {
  return cases.flatMap((item) => {
    const attemptIds = item.attempts.filter((attempt) => attempt.status === "technical_failure").map((attempt) => attempt.id);
    if (attemptIds.length === 0) return [];
    const label = item.masked ? item.title : `${item.case_code} · ${item.title}`;
    return [{ key: item.snapshot_item_id, label, attemptIds }];
  });
}

/**
 * Pilihan checkbox menjadi body Coba ulang. Semua kasus gagal dicentang berarti "semua yang gagal"
 * (all_failed); sebagian berarti attempt_ids. Tanpa centang tidak ada yang dikirim.
 */
export function retrySelection(chosen: ReadonlySet<string>, failed: ReadonlyArray<FailedCase>): RetrySelection | null {
  const picked = failed.filter((item) => chosen.has(item.key));
  if (picked.length === 0) return null;
  if (picked.length === failed.length) return { allFailed: true };
  return { attemptIds: picked.flatMap((item) => item.attemptIds) };
}

const CONTROL_ERRORS = messages({
  id: {
    INVALID_TRANSITION: "Status sesi sudah berubah. Muat ulang halaman.",
    SESSION_NOT_RESUMABLE: "Sesi ini tidak sedang dijeda atau dibatalkan. Muat ulang halaman.",
    SESSION_ARCHIVED: "Sesi yang sudah diarsipkan tidak bisa dikontrol.",
    SESSION_ACCEPTED: "Sesi ini sudah diterima apa adanya. Hapus tandanya dulu.",
    SESSION_NOT_AUTOMATIC: "Hanya sesi otomatis yang bisa dijeda, dibatalkan, atau dilanjutkan.",
    MODEL_VERSION_CHANGED: "Versi model produk sudah berbeda dari saat sesi dimulai. Buat sesi baru untuk mengukur lagi.",
    ANOTHER_SESSION_RUNNING: "Masih ada sesi otomatis lain yang berjalan. Lanjutkan setelah sesi itu selesai.",
    ATTEMPT_RECOVERY_REQUIRED: "Ada percobaan yang hasilnya belum pasti. Coba lagi setelah pemulihan selesai.",
    MEASUREMENT_NOT_FOUND: "Sesi tidak ditemukan. Muat ulang halaman.",
    NOT_YOUR_SESSION: "Anda hanya bisa mengontrol sesi yang Anda buat.",
    // Aksi kontrol memakai silentForbidden, jadi 403 (peran berubah saat halaman terbuka) sampai di sini.
    FORBIDDEN: "Peran Anda tidak bisa mengontrol sesi ini. Muat ulang halaman.",
    ADMIN_CONFIRMATION_REQUIRED: "Melanjutkan tanpa versi model terverifikasi perlu konfirmasi Admin.",
    SESSION_NOT_RETRYABLE: "Hanya sesi yang selesai dengan kegagalan yang bisa dicoba ulang.",
    ATTEMPT_NOT_RETRYABLE: "Sebagian percobaan yang dipilih sudah tidak gagal. Muat ulang halaman.",
    NO_FAILED_ATTEMPTS: "Tidak ada percobaan yang gagal untuk dicoba ulang. Muat ulang halaman.",
    fallback: "Permintaan gagal. Coba lagi.",
  },
  en: {
    INVALID_TRANSITION: "The session status has changed. Reload the page.",
    SESSION_NOT_RESUMABLE: "This session is not paused or cancelled. Reload the page.",
    SESSION_ARCHIVED: "An archived session cannot be controlled.",
    SESSION_ACCEPTED: "This session is already accepted as-is. Remove that mark first.",
    SESSION_NOT_AUTOMATIC: "Only an automatic session can be paused, cancelled, or resumed.",
    MODEL_VERSION_CHANGED: "The product's model version is different from when the session started. Create a new session to measure again.",
    ANOTHER_SESSION_RUNNING: "Another automatic session is still running. Resume after that session finishes.",
    ATTEMPT_RECOVERY_REQUIRED: "An attempt still has an uncertain result. Try again after recovery finishes.",
    MEASUREMENT_NOT_FOUND: "Session not found. Reload the page.",
    NOT_YOUR_SESSION: "You can only control a session you created.",
    FORBIDDEN: "Your role cannot control this session. Reload the page.",
    ADMIN_CONFIRMATION_REQUIRED: "Resuming without a verified model version needs an Admin to confirm.",
    SESSION_NOT_RETRYABLE: "Only a session that finished with failures can be retried.",
    ATTEMPT_NOT_RETRYABLE: "Some selected attempts are no longer failed. Reload the page.",
    NO_FAILED_ATTEMPTS: "There are no failed attempts to retry. Reload the page.",
    fallback: "The request failed. Try again.",
  },
});

export function controlErrorMessage(error: unknown, locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(CONTROL_ERRORS, locale);
  const known =
    error instanceof ApiError && error.code !== "fallback" && Object.hasOwn(copy, error.code)
      ? copy[error.code as keyof typeof copy]
      : undefined;
  return known ?? copy.fallback;
}
