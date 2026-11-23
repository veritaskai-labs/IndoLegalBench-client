/**
 * Aturan tampilan halaman impor CSV (PBI-4 SCRUM-340). Pemeriksaan di sini hanya bantuan sebelum
 * mengunggah; validasi berkas yang sebenarnya (UTF-8, header, maksimal 500 baris, ukuran) ada di server.
 */

/** Pesan cek awal, atau null bila berkas boleh dikirim ke server. */
export function precheckFile(_file: File | null): string | null {
  return null;
}
