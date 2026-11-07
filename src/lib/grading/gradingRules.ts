import { ApiError } from "@/lib/apiClient";
import type { Role } from "@/types";
import type { SessionDetail, SessionStatus } from "@/types/measurement";

/** Sama dengan GRADABLE_SESSION_STATUSES di server#114 (ensure_session_gradable). */
const GRADABLE: ReadonlySet<SessionStatus> = new Set(["running", "finished", "finished_with_failures"]);

export type GradeInput = {
  session: Pick<SessionDetail, "status" | "archived_at">;
  role: Role | null;
  /** Sesi sudah punya hasil penilaian. */
  graded: boolean;
};

/**
 * Tombol Nilai (PBI-14 AC6) hanya untuk yang akan diterima server: Admin, sesi yang belum
 * diarsipkan, dengan status yang boleh dinilai. Hanya untuk penilaian pertama; setelah ada hasil,
 * menilai lagi adalah "Nilai ulang dengan versi terbaru" dari SCRUM-228. Syarat sesi manual (semua
 * jawaban terisi) menyusul dari PBI-22, karena server belum memeriksanya. Server tetap yang
 * menolak (403/409).
 */
export function canGrade({ session, role, graded }: GradeInput): boolean {
  return role === "admin" && session.archived_at === null && GRADABLE.has(session.status) && !graded;
}

/** Sama dengan list_graded_sessions di server#114: peran lain dijawab 403. */
const GRADED_SESSION_ROLES: ReadonlySet<Role> = new Set(["admin", "viewer"]);

/**
 * Daftar sesi yang dinilai di Laporan (keputusan PO) hanya ditawarkan ke Admin dan Viewer. Ini hanya
 * menyembunyikan; server tetap menolak peran lain, jadi menyembunyikan tidak menjadi satu-satunya pagar.
 */
export function canSeeGradedSessions(role: Role | null): boolean {
  return role !== null && GRADED_SESSION_ROLES.has(role);
}

/** 404 sebelum penilaian pertama: hasil kosong, bukan kesalahan. */
export function isNotGraded(error: unknown): boolean {
  return error instanceof ApiError && error.code === "GRADING_NOT_FOUND";
}

const NOT_FOUND = "Sesi tidak ditemukan. Muat ulang halaman.";

const GRADE_ERRORS: Record<string, string> = {
  SESSION_NOT_GRADABLE: "Sesi ini belum bisa dinilai. Hanya sesi yang berjalan atau sudah selesai yang bisa dinilai.",
  SESSION_ARCHIVED: "Sesi yang sudah diarsipkan tidak bisa dinilai.",
  MEASUREMENT_NOT_FOUND: NOT_FOUND,
  // grade memakai silentForbidden, jadi 403 biasa (peran berubah saat halaman terbuka) sampai di sini.
  FORBIDDEN: "Hanya Admin yang bisa memicu penilaian. Muat ulang halaman.",
};

const RESULTS_ERRORS: Record<string, string> = {
  // server#114: hasil sesi yang masih berjalan hanya untuk Admin.
  FORBIDDEN: "Hasil penilaian sesi yang masih berjalan hanya dapat dilihat Admin.",
  MEASUREMENT_NOT_FOUND: NOT_FOUND,
};

function messageFor(table: Record<string, string>, error: unknown, fallback: string): string {
  const known = error instanceof ApiError ? table[error.code] : undefined;
  return known ?? fallback;
}

export function gradeErrorMessage(error: unknown): string {
  return messageFor(GRADE_ERRORS, error, "Penilaian gagal. Coba lagi.");
}

export function resultsErrorMessage(error: unknown): string {
  return messageFor(RESULTS_ERRORS, error, "Gagal memuat hasil penilaian. Coba lagi.");
}

const SESSIONS_ERRORS: Record<string, string> = {
  // server#114 list_graded_sessions: hanya Admin dan Viewer.
  FORBIDDEN: "Daftar hasil penilaian hanya dapat dilihat Admin dan Viewer.",
};

export function sessionsErrorMessage(error: unknown): string {
  return messageFor(SESSIONS_ERRORS, error, "Gagal memuat daftar sesi yang dinilai. Coba lagi.");
}
