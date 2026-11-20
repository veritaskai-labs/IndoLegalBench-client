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
  listPublished: () => readAllPublished(),
};

// Server maximum per page (GET /published-reports size le=100).
const PAGE_SIZE = 100;

/**
 * Semua versi yang sedang terbit, halaman demi halaman. Daftar terbit dan pilihan Ganti versi harus lengkap
 * (AC9), jadi halaman berikutnya diminta sampai jumlahnya mencapai total. Halaman kosong menghentikan perulangan,
 * supaya daftar yang menyusut di tengah jalan tidak membuat permintaan tanpa akhir.
 */
async function readAllPublished(): Promise<PublishedReportListItem[]> {
  const all: PublishedReportListItem[] = [];
  for (let page = 1; ; page += 1) {
    const result = await apiFetch<PublishedReportPage>(`/published-reports?page=${page}&size=${PAGE_SIZE}`, {
      silentForbidden: true,
    });
    all.push(...result.items);
    if (result.items.length === 0 || all.length >= result.total) return all;
  }
}
