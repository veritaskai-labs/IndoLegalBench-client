import type { MeasurementFilter, PickableSession } from "./builderTypes";

/**
 * Pilih atau lepas satu sesi. Satu produk hanya diwakili satu sesi (server: DUPLICATE_PRODUCT,
 * diputuskan lewat product_id), jadi memilih sesi lain dari produk yang sama menggantikan yang
 * lama. Sesi yang tidak layak tidak bisa dipilih, tapi yang sudah terpilih tetap bisa dilepas.
 * Selalu mengembalikan daftar baru (state React tidak diubah di tempat). Generik supaya baris
 * lengkap (label, nama produk) tetap utuh untuk halaman.
 */
export function toggleSession<T extends PickableSession>(picked: readonly T[], session: T): T[] {
  if (picked.some((s) => s.session_id === session.session_id)) {
    return picked.filter((s) => s.session_id !== session.session_id);
  }
  if (!session.eligible) return [...picked];
  return [...picked.filter((s) => s.product_id !== session.product_id), session];
}

/** Sesi tampil di pilihan bila jenisnya cocok dengan filter (PBI-15 AC5); "all" menampilkan semua. */
export function matchesFilter(session: PickableSession, filter: MeasurementFilter): boolean {
  return filter === "all" || session.session_type === filter;
}

/**
 * Pisahkan sesi terpilih menjadi yang ikut dan yang dilepas filter. Server membuang sesi di luar
 * measurement_filter tanpa pesan, jadi halaman melakukannya sendiri dan menyebut sesi yang dilepas.
 */
export function applyFilter<T extends PickableSession>(
  picked: readonly T[],
  filter: MeasurementFilter,
): { kept: T[]; dropped: T[] } {
  const kept: T[] = [];
  const dropped: T[] = [];
  for (const session of picked) (matchesFilter(session, filter) ? kept : dropped).push(session);
  return { kept, dropped };
}
