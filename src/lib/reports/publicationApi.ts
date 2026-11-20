import { apiFetch } from "@/lib/apiClient";
import type { PublicationRead, PublishedReportListItem, PublishedReportPage } from "@/types/reports";

/**
 * Penerbitan laporan (PBI-17 SCRUM-335, API SCRUM-332). silentForbidden: penolakan tampil di dialog atau halaman
 * sendiri, bukan pindah ke /forbidden.
 */
export interface PublicationGateway {
  /** Terbitkan laporan tersimpan, atau ganti satu versi yang sedang terbit (supersedesId = id versi terbitnya). */
  publish(reportId: string, supersedesId?: string): Promise<PublicationRead>;
  /** Versi yang sedang terbit, untuk semua pengguna yang login. Versi yang sudah diganti tidak ikut. */
  listPublished(): Promise<PublishedReportListItem[]>;
}

export const httpPublicationGateway: PublicationGateway = {
  publish: (reportId, supersedesId) =>
    apiFetch<PublicationRead>(`/reports/${encodeURIComponent(reportId)}/publish`, {
      method: "POST",
      body: JSON.stringify(supersedesId ? { supersedes_id: supersedesId } : {}),
      silentForbidden: true,
    }),
  // shortcut: only the first page of 100 (server maximum), same as the saved report list.
  listPublished: () =>
    apiFetch<PublishedReportPage>("/published-reports?size=100", { silentForbidden: true }).then((page) => page.items),
};
