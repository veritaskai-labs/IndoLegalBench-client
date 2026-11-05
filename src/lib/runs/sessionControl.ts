import { ApiError } from "@/lib/apiClient";
import type { Role } from "@/types";
import type { SessionDetail, SessionStatus } from "@/types/measurement";

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

const CONTROL_ERRORS: Record<string, string> = {
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
};

export function controlErrorMessage(error: unknown): string {
  const known = error instanceof ApiError ? CONTROL_ERRORS[error.code] : undefined;
  return known ?? "Permintaan gagal. Coba lagi.";
}
