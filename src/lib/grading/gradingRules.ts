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
  return role === "admin" && isGradableSession(session) && !graded;
}

/** Sesi yang diterima server untuk dinilai, pertama kali maupun ulang: belum diarsipkan dan berstatus boleh. */
export function isGradableSession(session: GradeInput["session"]): boolean {
  return session.archived_at === null && GRADABLE.has(session.status);
}

/** Sama dengan list_graded_sessions di server#133: peran lain dijawab 403. */
const GRADED_SESSION_ROLES: ReadonlySet<Role> = new Set(["admin", "viewer", "contributor"]);

/**
 * Daftar sesi yang dinilai di Laporan hanya ditawarkan ke Admin, Viewer, dan Kontributor (hak baca
 * Viewer, PBI-24 AC10). Ini hanya menyembunyikan; server tetap menolak peran lain, jadi
 * menyembunyikan tidak menjadi satu-satunya pagar.
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
  // Nilai ulang dengan versi pilihan (AC7), server#112: versi yang dipilih tidak ada.
  RUBRIC_VERSION_NOT_FOUND: "Versi rubrik yang dipilih tidak ditemukan. Muat ulang halaman.",
  // grade memakai silentForbidden, jadi 403 biasa (peran berubah saat halaman terbuka) sampai di sini.
  FORBIDDEN: "Hanya Admin yang bisa memicu penilaian. Muat ulang halaman.",
  // server#114 session_grade.py: 409 bila tidak ada versi rubrik aktif. Belum tercantum di responses
  // OpenAPI /grade, jadi kodenya diambil dari server, bukan dari kontrak.
  RUBRIC_NOT_ACTIVE: "Belum ada versi rubrik yang aktif. Aktifkan satu versi rubrik dulu, lalu nilai lagi.",
  // PBI-22 AC9: sesi manual belum lengkap
  NOT_COMPLETE: "Semua kasus dan percobaan harus terisi sebelum sesi manual dapat dinilai.",
  MANUAL_SESSION_STATUS_INVALID: "Status sesi manual tidak valid untuk dinilai.",
  ANSWERS_CHANGED_DURING_GRADING: "Jawaban berubah selama proses penilaian berjalan. Muat ulang dan coba lagi.",
  // server#134: judge pilihan Admin sudah nonaktif atau bukan produk otomatis.
  JUDGE_NOT_ELIGIBLE: "Penilai yang dipilih tidak aktif atau bukan produk otomatis. Pilih penilai lain.",
};

// Perkiraan biaya (server#135): kode yang sama dengan /grade ikut kalimatnya, ditambah kode judge.
const ESTIMATE_ERRORS: Record<string, string> = {
  ...GRADE_ERRORS,
  JUDGE_PRICING_MISSING:
    "Harga token penilai ini belum lengkap, jadi biayanya belum bisa diperkirakan. Lengkapi harga di halaman Provider.",
  JUDGE_NOT_CONFIGURED: "Sesi ini belum punya penilai LLM dan belum ada yang dipilih.",
  JUDGE_PROVIDER_NOT_FOUND: "Produk penilai tidak ditemukan atau bukan produk AI otomatis. Muat ulang halaman.",
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

export function estimateErrorMessage(error: unknown): string {
  return messageFor(ESTIMATE_ERRORS, error, "Perkiraan biaya gagal dimuat. Coba lagi.");
}

export function resultsErrorMessage(error: unknown): string {
  return messageFor(RESULTS_ERRORS, error, "Gagal memuat hasil penilaian. Coba lagi.");
}

const SESSIONS_ERRORS: Record<string, string> = {
  // server#133 list_graded_sessions: hanya Admin, Viewer, dan Kontributor.
  FORBIDDEN: "Daftar hasil penilaian hanya dapat dilihat Admin, Viewer, dan Kontributor.",
};

export function sessionsErrorMessage(error: unknown): string {
  return messageFor(SESSIONS_ERRORS, error, "Gagal memuat daftar sesi yang dinilai. Coba lagi.");
}

const RUNS_ERRORS: Record<string, string> = {
  // server#122: riwayat penilaian hanya untuk Admin.
  FORBIDDEN: "Riwayat penilaian hanya dapat dilihat Admin. Muat ulang halaman.",
  MEASUREMENT_NOT_FOUND: NOT_FOUND,
  // server#134: run yang dibuka bukan milik sesi ini (atau sudah tidak ada).
  GRADING_RUN_NOT_FOUND: "Hasil penilaian ini tidak ditemukan. Muat ulang halaman.",
};

export function runsErrorMessage(error: unknown): string {
  return messageFor(RUNS_ERRORS, error, "Gagal memuat riwayat penilaian. Coba lagi.");
}
