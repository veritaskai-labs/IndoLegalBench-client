import { apiFetch } from "@/lib/apiClient";
import { readAllPages } from "@/lib/pagedList";
import type { PublicationRead, PublishedReportListItem, ReplaceCandidates } from "@/types/reports";

/**
 * Penerbitan laporan (PBI-17 SCRUM-335, API SCRUM-332). silentForbidden: penolakan tampil di dialog atau halaman
 * sendiri, bukan pindah ke /forbidden.
 */
export interface PublicationGateway {
  /** Terbitkan laporan tersimpan, atau ganti satu versi yang sedang terbit (supersedesId = id versi terbitnya). */
  publish(reportId: string, supersedesId?: string): Promise<PublicationRead>;
  /** Versi yang sedang terbit, untuk semua pengguna yang login. Versi yang sudah diganti tidak ikut. */
  listPublished(): Promise<PublishedReportListItem[]>;
  /**
   * Pilihan ganti versi untuk laporan yang sedang dibuka, hanya yang membandingkan produk yang sama (SCRUM-373,
   * API SCRUM-371). Laporan tersimpan mendapat versi terbit yang bisa diganti; laporan terbit mendapat laporan
   * tersimpan penggantinya. Server yang mencocokkan produk, karena label beku bisa berupa kode yang sama untuk
   * produk yang berbeda.
   */
  replaceCandidates(reportId: string): Promise<ReplaceCandidates>;
}

export const httpPublicationGateway: PublicationGateway = {
  publish: (reportId, supersedesId) =>
    apiFetch<PublicationRead>(`/reports/${encodeURIComponent(reportId)}/publish`, {
      method: "POST",
      body: JSON.stringify(supersedesId ? { supersedes_id: supersedesId } : {}),
      silentForbidden: true,
    }),
  // Daftar terbit dan pilihan Ganti versi harus lengkap (AC9), jadi semua halaman dibaca.
  listPublished: () => readAllPages<PublishedReportListItem>("/published-reports"),
  replaceCandidates: (reportId) =>
    apiFetch<ReplaceCandidates>(`/reports/${encodeURIComponent(reportId)}/replace-candidates`, { silentForbidden: true }),
};

