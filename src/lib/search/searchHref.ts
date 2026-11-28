import type { components } from "@/lib/generated/api";
import { caseEditPath, caseReadPath } from "@/lib/cases/casePaths";
import type { Role } from "@/types";

/** Halaman tujuan sesi yang dipilih server per peran (SCRUM-351). */
export type SearchDestination = components["schemas"]["SessionSearchHit"]["destination"];

/**
 * Record atas union kontrak, bukan switch dengan default: kalau server menambah tujuan dan kontrak
 * diperbarui, tsc gagal di sini alih-alih diam-diam membuka halaman yang salah.
 */
export const SESSION_ROUTE: Record<SearchDestination, (id: string) => string> = {
  automatic_detail: (id) => `/runs/${encodeURIComponent(id)}`,
  manual_detail: (id) => `/manual-runs/${encodeURIComponent(id)}`,
  grading_results: (id) => `/reports/sessions/${encodeURIComponent(id)}`,
};

export function suiteHref(id: string): string {
  return `/suites/${encodeURIComponent(id)}`;
}

/** Developer AI hanya boleh membaca kasus (SCRUM-184); peran lain langsung ke editor tanpa redirect. */
export function caseHref(id: string, role: Role): string {
  return role === "developer_ai" ? caseReadPath(id) : caseEditPath(id);
}
