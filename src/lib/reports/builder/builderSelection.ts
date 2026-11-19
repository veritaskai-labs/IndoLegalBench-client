import type { MeasurementFilter, PickableSession } from "./builderTypes";

/** Masalah kombinasi sesi yang dipilih; kode sama dengan selection_errors di server (#147). */
export type SelectionProblem = "NEED_AT_LEAST_TWO_PRODUCTS";

/**
 * Pilih atau lepas satu sesi. Satu produk hanya diwakili satu sesi (server: DUPLICATE_PRODUCT,
 * diputuskan lewat product_id), jadi memilih sesi lain dari produk yang sama menggantikan yang
 * lama. Sesi yang tidak layak tidak bisa dipilih, tapi yang sudah terpilih tetap bisa dilepas.
 * Selalu mengembalikan daftar baru (state React tidak diubah di tempat).
 */
export function toggleSession(
  picked: readonly PickableSession[],
  session: PickableSession,
): PickableSession[] {
  if (picked.some((s) => s.session_id === session.session_id)) {
    return picked.filter((s) => s.session_id !== session.session_id);
  }
  if (!session.eligible) return [...picked];
  return [...picked.filter((s) => s.product_id !== session.product_id), session];
}

/** Perbandingan butuh minimal dua produk berbeda (dihitung lewat product_id, bukan jumlah sesi). */
export function selectionProblems(picked: readonly PickableSession[]): SelectionProblem[] {
  const products = new Set(picked.map((s) => s.product_id));
  return products.size < 2 ? ["NEED_AT_LEAST_TWO_PRODUCTS"] : [];
}

export function matchesFilter(session: PickableSession, filter: MeasurementFilter): boolean {
  void session;
  void filter;
  return true;
}

export function applyFilter(
  picked: readonly PickableSession[],
  filter: MeasurementFilter,
): { kept: PickableSession[]; dropped: PickableSession[] } {
  void filter;
  return { kept: [...picked], dropped: [] };
}

export function judgeDiffers(picked: readonly PickableSession[]): boolean {
  void picked;
  return false;
}
