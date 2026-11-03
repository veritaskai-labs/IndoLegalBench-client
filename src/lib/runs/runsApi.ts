import { apiFetch } from "@/lib/apiClient";
import type { SessionArchiveResponse, SessionDetail, SessionListItem } from "@/types/measurement";

const BASE = "/measurements";

function sessionPath(sessionId: string): string {
  return `${BASE}/${encodeURIComponent(sessionId)}`;
}

/** GET /measurements: sesi yang belum diarsipkan, terbaru di atas (PBI-11 AC10). */
export function listSessions(): Promise<SessionListItem[]> {
  return apiFetch<SessionListItem[]>(BASE);
}

/**
 * GET /measurements/{id}: snapshot kasus dan jawaban mentah per percobaan (PBI-11 AC7, AC8).
 * 404 MEASUREMENT_NOT_FOUND diteruskan ke halaman; 403 tetap dialihkan ke /forbidden.
 */
export function getSession(sessionId: string): Promise<SessionDetail> {
  return apiFetch<SessionDetail>(sessionPath(sessionId));
}

/**
 * PATCH /measurements/{id}/archive. silentForbidden: 403 NOT_YOUR_SESSION (Developer AI pada
 * sesi orang lain) ditampilkan di halaman, bukan dialihkan ke /forbidden.
 */
export function archiveSession(sessionId: string): Promise<SessionArchiveResponse> {
  return apiFetch<SessionArchiveResponse>(`${sessionPath(sessionId)}/archive`, {
    method: "PATCH",
    silentForbidden: true,
  });
}
