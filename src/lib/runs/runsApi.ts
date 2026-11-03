import { apiFetch } from "@/lib/apiClient";
import type { SessionArchiveResponse, SessionListItem } from "@/types/measurement";

const BASE = "/measurements";

/** GET /measurements: sesi yang belum diarsipkan, terbaru di atas (PBI-11 AC10). */
export function listSessions(): Promise<SessionListItem[]> {
  return apiFetch<SessionListItem[]>(BASE);
}

/**
 * PATCH /measurements/{id}/archive. silentForbidden: 403 NOT_YOUR_SESSION (Developer AI pada
 * sesi orang lain) ditampilkan di halaman, bukan dialihkan ke /forbidden.
 */
export function archiveSession(sessionId: string): Promise<SessionArchiveResponse> {
  return apiFetch<SessionArchiveResponse>(`${BASE}/${encodeURIComponent(sessionId)}/archive`, {
    method: "PATCH",
    silentForbidden: true,
  });
}
