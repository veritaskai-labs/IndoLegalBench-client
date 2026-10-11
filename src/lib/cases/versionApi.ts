import { apiFetch } from "@/lib/apiClient";
import type { CaseRead } from "@/types/case";
import type { VersionCompare, VersionSummary } from "@/types/caseVersion";

function versionsPath(caseId: string): string {
  return `/cases/${encodeURIComponent(caseId)}/versions`;
}

/** POST /cases/{case_id}/versions. Menyalin versi yang disetujui menjadi draf baru; tanpa body. */
export function startCaseVersion(caseId: string): Promise<CaseRead> {
  return apiFetch<CaseRead>(versionsPath(caseId), { method: "POST" });
}

/** GET /cases/{case_id}/versions. Satu baris per versi beserta bagian yang berubah. */
export function listCaseVersions(caseId: string): Promise<VersionSummary[]> {
  return apiFetch<VersionSummary[]>(versionsPath(caseId));
}

/** GET /cases/{case_id}/versions/compare. a dan b adalah nomor versi, bukan ID. */
export function compareCaseVersions(
  caseId: string,
  a: number,
  b: number,
): Promise<VersionCompare> {
  const query = new URLSearchParams({ a: String(a), b: String(b) });
  return apiFetch<VersionCompare>(`${versionsPath(caseId)}/compare?${query.toString()}`);
}

/**
 * GET /cases/{case_id}/versions/current. Versi yang sedang dikerjakan (draf, ditinjau, atau perlu
 * revisi), bukan yang berlaku. Hanya pembuat kasus atau admin; 404 NO_OPEN_VERSION bila tidak ada.
 */
export function getOpenCaseVersion(caseId: string): Promise<CaseRead> {
  return apiFetch<CaseRead>(`${versionsPath(caseId)}/current`);
}
