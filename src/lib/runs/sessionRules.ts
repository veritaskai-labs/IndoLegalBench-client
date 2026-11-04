import { ApiError } from "@/lib/apiClient";
import type { Me } from "@/types";
import type { SessionListItem, SessionStatus } from "@/types/measurement";

/**
 * Label status sesi (PBI-11 AC10). Record atas enum kontrak, bukan switch dengan default:
 * status baru dari server (mis. SCRUM-240) membuat tsc gagal di sini setelah gen:api,
 * jadi tidak pernah tampil diam-diam dengan label cadangan.
 */
export const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  queued: "Menunggu",
  running: "Berjalan",
  finished: "Selesai",
  finished_with_failures: "Selesai dengan kegagalan",
  failed: "Gagal",
};

/** Sama dengan server (session_rules._ENDED / has_ended): hanya sesi yang sudah berakhir. */
const ENDED: ReadonlySet<SessionStatus> = new Set(["finished", "finished_with_failures", "failed"]);

/** Sesi sudah berakhir: boleh diarsipkan, dan Developer AI boleh membaca jawabannya (server#91 has_ended). */
export function hasEnded(status: SessionStatus): boolean {
  return ENDED.has(status);
}

/** "X dari N". Sesi antre belum punya snapshot, jadi belum ada percobaan untuk dihitung. */
export function formatProgress(session: Pick<SessionListItem, "status" | "progress">): string {
  const { completed, total } = session.progress;
  if (session.status === "queued" && total === 0) return "Menunggu antrean";
  return `${completed} dari ${total}`;
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
