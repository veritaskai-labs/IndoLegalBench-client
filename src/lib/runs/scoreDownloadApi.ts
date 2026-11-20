import { apiFetchBlob } from "@/lib/apiClient";

/**
 * Unduhan skor satu sesi (SCRUM-329). Berkasnya disusun server
 * (GET /reports/sessions/{id}/csv, SCRUM-327). Halaman tidak merakit CSV
 * dari jawaban, skor, atau alasan yang sedang ditampilkan.
 */

export type ScoreFile = {
  blob: Blob;
  fileName: string;
};

export type ScoreDownload = {
  download(sessionId: string): Promise<ScoreFile>;
};

/** Hanya id yang aman dipakai sebagai nama berkas. Selain itu, nama tetap. */
const SAFE_SESSION_ID = /^[A-Za-z0-9-]{1,64}$/;

export function scoreFileName(sessionId: string): string {
  return SAFE_SESSION_ID.test(sessionId) ? `skor-${sessionId}.csv` : "skor.csv";
}

/** Path unduhan. Id dikodekan supaya tidak mengubah segmen rute. */
export function scoreDownloadPath(sessionId: string): string {
  return `/reports/sessions/${encodeURIComponent(sessionId)}/csv`;
}

export const httpScoreDownload: ScoreDownload = {
  async download(sessionId) {
    const blob = await apiFetchBlob(scoreDownloadPath(sessionId), { silentForbidden: true });
    return { blob, fileName: scoreFileName(sessionId) };
  },
};
