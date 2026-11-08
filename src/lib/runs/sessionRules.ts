import { ApiError } from "@/lib/apiClient";
import type { Me } from "@/types";
import type { SessionListItem, SessionStatus, StopReason } from "@/types/measurement";
import { countOfTotal } from "@/lib/runs/sessionProgress";

/**
 * Label status sesi (PBI-11 AC10). Record atas enum kontrak, bukan switch dengan default:
 * status baru dari server (mis. SCRUM-240) membuat tsc gagal di sini setelah gen:api,
 * jadi tidak pernah tampil diam-diam dengan label cadangan.
 */
export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  queued: "Menunggu",
  running: "Berjalan",
  // server#97: paused mencakup Jeda dan berhenti oleh sistem; sessionStatusLabel membedakannya.
  paused: "Dijeda",
  cancelled: "Dibatalkan",
  finished: "Selesai",
  finished_with_failures: "Selesai dengan kegagalan",
  failed: "Gagal",
  // server#116 (PBI-22): status sesi manual, dengan label yang sama dengan server (runs/models.py).
  not_filled: "Belum terisi",
  partially_filled: "Terisi sebagian",
  complete: "Lengkap",
  graded: "Dinilai",
  finalized: "Selesai",
};

/**
 * Label status dengan penyebab berhenti (PBI-12 AC9). paused karena anggaran habis atau server
 * dimulai ulang dibaca "Dihentikan"; Jeda dari pengguna, atau baris tanpa stop_reason (daftar
 * sesi, sesi lama), tetap "Dijeda".
 */
export function sessionStatusLabel(status: SessionStatus, stopReason?: StopReason | null): string {
  if (status === "paused" && stopReason != null && stopReason !== "user") return "Dihentikan";
  return SESSION_STATUS_LABEL[status];
}

/** Sesi manual per D8: Belum terisi, Terisi sebagian, Lengkap, Dinilai, Selesai (PBI-22). */
export const MANUAL_STATUSES: ReadonlySet<SessionStatus> = new Set([
  "not_filled",
  "partially_filled",
  "complete",
  "graded",
  "finalized",
]);

export function isManualStatus(status: SessionStatus): boolean {
  return MANUAL_STATUSES.has(status);
}

/** Batas karakter nama/label sesi (OpenAPI ManualStartRequest/StartRequest: max 200). */
export const SESSION_LABEL_MAX_LENGTH = 200;

/** Standar pengulangan untuk sesi otomatis (PBI-11 / server SCRUM-210). */
export const AUTOMATIC_SESSION_STANDARD_REPETITIONS = 3;

/** Standar dan batas pengulangan untuk sesi pengukuran manual (PBI-22 AC1, AC12, OpenAPI ManualStartRequest). */
export const MANUAL_SESSION_DEFAULT_REPETITIONS = 1;
export const MANUAL_SESSION_MIN_REPETITIONS = 1;
export const MANUAL_SESSION_MAX_REPETITIONS = 5;

/** Sama dengan server (session_rules._ENDED / has_ended): hanya sesi yang sudah berakhir. */
// cancelled belum berakhir: server#102 masih bisa melanjutkannya, dan server has_ended tidak memuatnya.
// finalized (sesi manual yang sudah ditutup Admin) berakhir sejak server#116.
const ENDED: ReadonlySet<SessionStatus> = new Set(["finished", "finished_with_failures", "failed", "finalized"]);

/** Sesi sudah berakhir: boleh diarsipkan, dan Developer AI boleh membaca jawabannya (server#91 has_ended). */
export function hasEnded(status: SessionStatus): boolean {
  return ENDED.has(status);
}

/**
 * Status yang tidak berubah sendiri: sudah berakhir, atau dibatalkan dan menunggu Lanjutkan.
 * Halaman detail berhenti polling di sini (SCRUM-219); aturan arsip dan jawaban tetap memakai hasEnded.
 */
export function isSettled(status: SessionStatus): boolean {
  return hasEnded(status) || status === "cancelled";
}

/** "X dari N". Sesi antre belum punya snapshot, jadi belum ada percobaan untuk dihitung. */
export function formatProgress(session: Pick<SessionListItem, "status" | "progress">): string {
  const { completed, total } = session.progress;
  if (session.status === "queued" && total === 0) return "Menunggu antrean";
  return countOfTotal(completed, total);
}

/** Admin mengelola sesi siapa pun, Developer AI hanya sesi yang ia buat (D10). */
function isAdminOrCreator(session: Pick<SessionListItem, "created_by">, me: Pick<Me, "id" | "role">): boolean {
  if (me.role === "admin") return true;
  return me.role === "developer_ai" && session.created_by === me.id;
}

/**
 * Tombol Arsipkan hanya untuk yang akan diterima server (D10): Admin semua sesi yang sudah
 * berakhir, Developer AI hanya sesinya sendiri. Server tetap yang menolak (403/409).
 */
export function canArchive(
  session: Pick<SessionListItem, "status" | "created_by">,
  me: Pick<Me, "id" | "role">,
): boolean {
  return hasEnded(session.status) && isAdminOrCreator(session, me);
}

const ARCHIVE_ERRORS: Record<string, string> = {
  SESSION_NOT_ARCHIVABLE: "Sesi yang masih antre atau berjalan belum bisa diarsipkan.",
  SESSION_ALREADY_ARCHIVED: "Sesi ini sudah diarsipkan.",
  NOT_YOUR_SESSION: "Developer AI hanya bisa mengarsipkan sesi yang ia buat.",
  MEASUREMENT_NOT_FOUND: "Sesi tidak ditemukan. Muat ulang daftar.",
  // archiveSession memakai silentForbidden, jadi 403 biasa (peran berubah saat halaman terbuka) sampai di sini.
  FORBIDDEN: "Peran Anda tidak lagi boleh mengarsipkan sesi. Muat ulang halaman.",
};

export function archiveErrorMessage(error: unknown): string {
  const known = error instanceof ApiError ? ARCHIVE_ERRORS[error.code] : undefined;
  return known ?? "Sesi gagal diarsipkan. Coba lagi.";
}

/**
 * Tombol Kembalikan di tab Arsip (AC10). Status tidak dicek: sesi arsip pasti sudah berakhir dan
 * server mengabaikan statusnya. Server tetap yang menolak (403/409).
 */
export function canUnarchive(session: Pick<SessionListItem, "created_by">, me: Pick<Me, "id" | "role">): boolean {
  return isAdminOrCreator(session, me);
}

const UNARCHIVE_ERRORS: Record<string, string> = {
  SESSION_NOT_ARCHIVED: "Sesi ini sudah dikembalikan. Muat ulang daftar.",
  NOT_YOUR_SESSION: "Developer AI hanya bisa mengembalikan sesi yang ia buat.",
  MEASUREMENT_NOT_FOUND: "Sesi tidak ditemukan. Muat ulang daftar.",
  // unarchiveSession memakai silentForbidden, jadi 403 biasa (peran berubah saat halaman terbuka) sampai di sini.
  FORBIDDEN: "Peran Anda tidak lagi boleh mengembalikan sesi. Muat ulang halaman.",
};

export function unarchiveErrorMessage(error: unknown): string {
  const known = error instanceof ApiError ? UNARCHIVE_ERRORS[error.code] : undefined;
  return known ?? "Sesi gagal dikembalikan. Coba lagi.";
}

/** case_count null selama sesi antre: snapshot baru dibuat saat sesi mulai. */
export function caseCountText(count: number | null): string {
  return count === null ? "–" : String(count);
}

/** Akun atau produk yang sudah tidak ada dikirim server sebagai null; nama kosong diperlakukan sama. */
export function unknownName(name: string | null): string {
  return name === null || name === "" ? "Tidak diketahui" : name;
}
