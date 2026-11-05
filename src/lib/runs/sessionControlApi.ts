import { apiFetch } from "@/lib/apiClient";
import type { SessionAcceptResponse, SessionControlResponse, SessionResumeResponse } from "@/types/measurement";

/**
 * Aksi kontrol sesi di halaman detail (PBI-12, SCRUM-220). Semua memakai silentForbidden:
 * 403 berarti peran berubah saat halaman terbuka, dan halaman yang menjelaskan, bukan
 * pengalihan ke /forbidden.
 */
function actionPath(sessionId: string, action: string): string {
  return `/measurements/${encodeURIComponent(sessionId)}/${action}`;
}

/**
 * PATCH /measurements/{id}/accept (AC9): Admin menerima sesi dengan kegagalan teknis sebagai
 * selesai sepenuhnya. Alasan dikirim apa adanya; server yang memangkas dan menolak alasan kosong
 * (422 REASON_REQUIRED).
 */
export function acceptAsIs(sessionId: string, reason: string): Promise<SessionAcceptResponse> {
  return apiFetch<SessionAcceptResponse>(actionPath(sessionId, "accept"), {
    method: "PATCH",
    body: JSON.stringify({ reason }),
    silentForbidden: true,
  });
}

/** DELETE /measurements/{id}/accept (AC9): tanda dihapus, sesi bisa dicoba ulang lagi. */
export function clearAcceptAsIs(sessionId: string): Promise<SessionAcceptResponse> {
  return apiFetch<SessionAcceptResponse>(actionPath(sessionId, "accept"), {
    method: "DELETE",
    silentForbidden: true,
  });
}

/** POST /measurements/{id}/pause (AC7): seluruh sesi berhenti; call yang sedang jalan tetap tersimpan. */
export function pauseSession(sessionId: string): Promise<SessionControlResponse> {
  return apiFetch<SessionControlResponse>(actionPath(sessionId, "pause"), { method: "POST", silentForbidden: true });
}

/** POST /measurements/{id}/cancel (AC7): hasil, call log dan biaya yang sudah ada tetap tersimpan. */
export function cancelSession(sessionId: string): Promise<SessionControlResponse> {
  return apiFetch<SessionControlResponse>(actionPath(sessionId, "cancel"), { method: "POST", silentForbidden: true });
}

/**
 * POST /measurements/{id}/resume (AC8): lanjutkan sisa pekerjaan. confirmUnverifiedVersion hanya
 * dikirim setelah Admin mengonfirmasi 409 MODEL_VERSION_CONFIRMATION_REQUIRED (server#102).
 */
export function resumeSession(
  sessionId: string,
  { confirmUnverifiedVersion = false }: { confirmUnverifiedVersion?: boolean } = {},
): Promise<SessionResumeResponse> {
  return apiFetch<SessionResumeResponse>(actionPath(sessionId, "resume"), {
    method: "POST",
    body: JSON.stringify({ confirm_unverified_version: confirmUnverifiedVersion }),
    silentForbidden: true,
  });
}
