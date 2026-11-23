import type { ProductLabelMode } from "@/types/reports";

/**
 * Nama dan penjelasan tiap pilihan label produk (SCRUM-367, PBI-15 AC9). Satu tabel dipakai oleh pilihan di form
 * dan keterangannya, supaya nama opsi dan penjelasannya tidak berbeda.
 */
export const LABEL_MODE_TEXT: Readonly<Record<ProductLabelMode, { label: string; help: string }>> = {
  real_name: {
    label: "Nama asli",
    help: "Laporan menulis nama produk sesuai penulisan aslinya, mis. AiYU. Cocok untuk laporan internal.",
  },
  code: {
    label: "Kode (anonim)",
    help: "Laporan menyamarkan produk sebagai Product A, Product B, dan seterusnya. Nama aslinya hanya Admin yang bisa melihat, di panel pemetaan pada detail laporan.",
  },
};

export interface LabelPreviewRow {
  productName: string;
  label: string;
}

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/** Kode menurut urutan produk: 0 jadi Product A, 25 jadi Product Z, 26 jadi Product AA (sama dengan server). */
export function codeLabel(index: number): string {
  if (index < 0) throw new RangeError(`urutan produk tidak boleh negatif: ${index}`);
  let letters = "";
  let number = index + 1;
  while (number > 0) {
    letters = LETTERS[(number - 1) % LETTERS.length] + letters;
    number = Math.floor((number - 1) / LETTERS.length);
  }
  return `Product ${letters}`;
}

/**
 * Pratinjau nama produk di laporan sebelum laporan dibuat. Server memberi kode menurut urutan sesi yang dikirim,
 * jadi pratinjau memakai urutan pilihan yang sama. Hanya untuk tampilan; yang tersimpan tetap hasil server.
 */
export function previewLabels(mode: ProductLabelMode, productNames: readonly string[]): LabelPreviewRow[] {
  return productNames.map((productName, index) => ({
    productName,
    label: mode === "code" ? codeLabel(index) : productName,
  }));
}
