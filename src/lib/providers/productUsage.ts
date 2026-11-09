import type { AiProduct, AiProductListItem } from "@/types/provider";

/** Decimal dari server berbentuk string ("1500000.00"); "1500000" bernilai sama. */
function sameAmount(a: string | null | undefined, b: string | null | undefined): boolean {
  if (a == null || b == null) return a == null && b == null;
  return Number(a) === Number(b);
}

/**
 * Gabungkan balasan PATCH/aktifkan (AiProductRead, tanpa kolom turunan) ke baris daftar.
 * Jumlah sesi dan sisa anggaran dihitung server (SCRUM-210). Selama jenis dan budget tetap,
 * nilai lama masih benar. Kalau berubah, hasilnya null: muat ulang daftar, karena client tidak
 * tahu biaya yang sudah terpakai (sisa anggaran dibatasi minimal 0).
 */
export function mergeSavedProduct(before: AiProductListItem, saved: AiProduct): AiProductListItem | null {
  if (before.measurement_type !== saved.measurement_type) return null;
  if (!sameAmount(before.monthly_budget_idr, saved.monthly_budget_idr)) return null;
  return {
    ...saved,
    session_count: before.session_count,
    remaining_budget_idr: before.remaining_budget_idr,
  };
}

/**
 * AC4 (UAT TC_23): jenis pengukuran terkunci sejak produk punya sesi pertama, sama dengan aturan
 * server. Dipakai untuk mengunci pilihan sejak formulir dibuka, bukan setelah server menolak.
 */
export function isMeasurementTypeLocked(item: AiProductListItem): boolean {
  return item.session_count > 0;
}
