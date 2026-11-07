import { apiFetch } from "@/lib/apiClient";
import type {
  AttemptCalls,
  MeasurementProgress,
  SessionArchiveResponse,
  SessionDetail,
  SessionListItem,
  SessionUnarchiveResponse,
} from "@/types/measurement";

const BASE = "/measurements";

function sessionPath(sessionId: string): string {
  return `${BASE}/${encodeURIComponent(sessionId)}`;
}

/**
 * GET /measurements: sesi yang belum diarsipkan, terbaru di atas (PBI-11 AC10).
 * archived=true meminta sesi arsip dengan kolom yang sama (server SCRUM-263).
 */
export function listSessions(archived = false): Promise<SessionListItem[]> {
  return apiFetch<SessionListItem[]>(archived ? `${BASE}?archived=true` : BASE);
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

/**
 * PATCH /measurements/{id}/unarchive: sesi tampil lagi di daftar utama, status tidak berubah.
 * silentForbidden seperti archiveSession: 403 NOT_YOUR_SESSION tampil di dialog, bukan /forbidden.
 */
export function unarchiveSession(sessionId: string): Promise<SessionUnarchiveResponse> {
  return apiFetch<SessionUnarchiveResponse>(`${sessionPath(sessionId)}/unarchive`, {
    method: "PATCH",
    silentForbidden: true,
  });
}

/**
 * GET /measurements/{id}/progress: angka layar pemantauan, di-poll tiap beberapa detik
 * (PBI-12 AC5, AC6). 404 MEASUREMENT_NOT_FOUND diteruskan ke panel supaya pesannya tampil
 * di tempat; 403 tetap dialihkan ke /forbidden, karena peran yang berubah saat halaman
 * terbuka memang tidak boleh lagi memantau.
 */
export function getProgress(sessionId: string): Promise<MeasurementProgress> {
  return apiFetch<MeasurementProgress>(`${sessionPath(sessionId)}/progress`);
}

/**
 * Fetch the technical call details of one attempt.
 * Server: SCRUM-218, PR #99.
 */
export function getAttemptCalls(
  sessionId: string,
  attemptId: string
): Promise<AttemptCalls> {
  return apiFetch<AttemptCalls>(
    `${sessionPath(sessionId)}/attempts/${encodeURIComponent(attemptId)}/calls`
  );
}