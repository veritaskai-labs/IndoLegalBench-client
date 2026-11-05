import { apiFetch } from "@/lib/apiClient";
import type { SessionAcceptResponse } from "@/types/measurement";

/**
 * Aksi kontrol sesi di halaman detail (PBI-12, SCRUM-220). Semua memakai silentForbidden:
 * 403 berarti peran berubah saat halaman terbuka, dan dialognya yang menjelaskan, bukan
 * pengalihan ke /forbidden.
 */
function acceptPath(sessionId: string): string {
  return `/measurements/${encodeURIComponent(sessionId)}/accept`;
}

/**
 * PATCH /measurements/{id}/accept (AC9): Admin menerima sesi dengan kegagalan teknis sebagai
 * selesai sepenuhnya. Alasan dikirim apa adanya; server yang memangkas dan menolak alasan kosong
 * (422 REASON_REQUIRED).
 */
export function acceptAsIs(sessionId: string, reason: string): Promise<SessionAcceptResponse> {
  return apiFetch<SessionAcceptResponse>(acceptPath(sessionId), {
    method: "PATCH",
    body: JSON.stringify({ reason }),
    silentForbidden: true,
  });
}

/** DELETE /measurements/{id}/accept (AC9): tanda dihapus, sesi bisa dicoba ulang lagi. */
export function clearAcceptAsIs(sessionId: string): Promise<SessionAcceptResponse> {
  return apiFetch<SessionAcceptResponse>(acceptPath(sessionId), {
    method: "DELETE",
    silentForbidden: true,
  });
}
