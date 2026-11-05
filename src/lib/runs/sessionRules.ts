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

/** Sama dengan server (session_rules._ENDED / has_ended): hanya sesi yang sudah berakhir. */
// cancelled belum berakhir: server#102 masih bisa melanjutkannya, dan server has_ended tidak memuatnya.
const ENDED: ReadonlySet<SessionStatus> = new Set(["finished", "finished_with_failures", "failed"]);

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

/**
 * Tombol Arsipkan hanya untuk yang akan diterima server (D10): Admin semua sesi yang sudah
 * berakhir, Developer AI hanya sesinya sendiri. Server tetap yang menolak (403/409).
 */
export function canArchive(
  session: Pick<SessionListItem, "status" | "created_by">,
  me: Pick<Me, "id" | "role">,
): boolean {
  if (!hasEnded(session.status)) return false;
  if (me.role === "admin") return true;
  return me.role === "developer_ai" && session.created_by === me.id;
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

/** case_count null selama sesi antre: snapshot baru dibuat saat sesi mulai. */
export function caseCountText(count: number | null): string {
  return count === null ? "–" : String(count);
}

/** Akun atau produk yang sudah tidak ada dikirim server sebagai null; nama kosong diperlakukan sama. */
export function unknownName(name: string | null): string {
  return name === null || name === "" ? "Tidak diketahui" : name;
}
