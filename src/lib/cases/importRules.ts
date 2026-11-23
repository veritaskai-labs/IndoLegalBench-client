/**
 * Aturan tampilan halaman impor CSV (PBI-4 SCRUM-340). Pemeriksaan di sini hanya bantuan sebelum
 * mengunggah; validasi berkas yang sebenarnya (UTF-8, header, maksimal 500 baris, ukuran) ada di server.
 */

const NO_FILE = "Pilih berkas CSV untuk diimpor.";
const NOT_CSV = "Berkas harus berupa .csv. Dari Google Sheets: File > Download > Comma Separated Values (.csv).";
const EMPTY_FILE = "Berkas kosong. Ekspor ulang dari Google Sheets.";

/** Pesan cek awal, atau null bila berkas boleh dikirim ke server. Ekstensi diperiksa sama seperti server. */
export function precheckFile(file: File | null): string | null {
  if (file === null) return NO_FILE;
  if (!file.name.toLowerCase().endsWith(".csv")) return NOT_CSV;
  if (file.size === 0) return EMPTY_FILE;
  return null;
}
