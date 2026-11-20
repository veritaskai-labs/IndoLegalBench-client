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
 * (AC9), jadi halaman berikutnya diminta sampai jumlahnya mencapai total. Halaman kosong atau tidak penuh
 * menghentikan perulangan, supaya daftar yang berubah di tengah jalan tidak membuat permintaan tanpa akhir.
 * Versi yang terbit di antara dua permintaan menggeser daftar, jadi baris yang sama bisa muncul lagi di halaman
 * berikutnya; baris dengan id yang sudah ada dilewati.
 */
async function readAllPublished(): Promise<PublishedReportListItem[]> {
  const all = new Map<string, PublishedReportListItem>();
  for (let page = 1; ; page += 1) {
    const result = await apiFetch<PublishedReportPage>(`/published-reports?page=${page}&size=${PAGE_SIZE}`, {
      silentForbidden: true,
    });
    for (const item of result.items) if (!all.has(item.id)) all.set(item.id, item);
    if (result.items.length < PAGE_SIZE || all.size >= result.total) return [...all.values()];
  }
}
