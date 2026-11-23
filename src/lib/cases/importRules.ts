/**
 * Aturan tampilan halaman impor CSV (PBI-4 SCRUM-340). Pemeriksaan di sini hanya bantuan sebelum
 * mengunggah; validasi berkas yang sebenarnya (UTF-8, header, maksimal 500 baris, ukuran) ada di server.
 */

export const NO_FILE_MESSAGE = "Pilih berkas CSV untuk diimpor.";
export const NOT_CSV_MESSAGE = "Berkas harus berupa .csv. Dari Google Sheets: File > Download > Comma Separated Values (.csv).";
const EMPTY_FILE = "Berkas kosong. Ekspor ulang dari Google Sheets.";

/** Pesan cek awal, atau null bila berkas boleh dikirim ke server. Ekstensi diperiksa sama seperti server. */
export function precheckFile(file: File | null): string | null {
  if (file === null) return NO_FILE_MESSAGE;
  if (!file.name.toLowerCase().endsWith(".csv")) return NOT_CSV_MESSAGE;
  if (file.size === 0) return EMPTY_FILE;
  return null;
}
