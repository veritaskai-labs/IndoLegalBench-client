import { apiFetch } from "@/lib/apiClient";

/** Batas server per halaman untuk daftar yang dipakai klien ini (size le=100). */
export const MAX_PAGE_SIZE = 100;

type Paged<T> = { items: T[]; total: number };

/**
 * Semua baris dari endpoint berhalaman (`page`, `size`), halaman demi halaman sampai jumlahnya mencapai total.
 * Halaman kosong atau tidak penuh menghentikan perulangan, supaya daftar yang berubah di tengah jalan tidak
 * membuat permintaan tanpa akhir. Baris baru di antara dua permintaan menggeser daftar, jadi baris yang sama bisa
 * muncul lagi di halaman berikutnya; baris dengan id yang sudah ada dilewati.
 */
export async function readAllPages<T extends { id: string }>(path: string): Promise<T[]> {
  const all = new Map<string, T>();
  const separator = path.includes("?") ? "&" : "?";
  for (let page = 1; ; page += 1) {
    const result = await apiFetch<Paged<T>>(`${path}${separator}page=${page}&size=${MAX_PAGE_SIZE}`, {
      silentForbidden: true,
    });
    for (const item of result.items) if (!all.has(item.id)) all.set(item.id, item);
    if (result.items.length < MAX_PAGE_SIZE || all.size >= result.total) return [...all.values()];
  }
}
