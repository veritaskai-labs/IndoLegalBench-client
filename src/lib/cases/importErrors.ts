import { ApiError } from "@/lib/apiClient";
import { NO_FILE_MESSAGE, NOT_CSV_MESSAGE } from "./importRules";

const TOO_LARGE = "Berkas terlalu besar. Pecah menjadi beberapa berkas.";

/**
 * Cadangan per kode impor CSV (server #157), dipakai hanya bila server tidak mengirim pesan. Pesan server
 * didahulukan karena lebih spesifik (jumlah baris, batas MB). Batasnya sendiri tidak disalin ke client.
 */
const FALLBACK: Readonly<Record<string, string>> = {
  IMPORT_FILE_REQUIRED: NO_FILE_MESSAGE,
  IMPORT_FILE_NOT_CSV: NOT_CSV_MESSAGE,
  IMPORT_FILE_NOT_UTF8: "Berkas harus berpengkodean UTF-8. Ekspor ulang dari Google Sheets.",
  IMPORT_FILE_TOO_LARGE: TOO_LARGE,
  IMPORT_FILE_UNREADABLE: "Berkas CSV rusak dan tidak bisa dibaca. Ekspor ulang dari Google Sheets.",
  IMPORT_HEADER_MISMATCH:
    "Header tidak sama dengan template. Pakai template dari sistem tanpa mengubah nama atau urutan kolom.",
  IMPORT_FILE_EMPTY: "Berkas tidak berisi baris kasus.",
  IMPORT_TOO_MANY_ROWS: "Berkas berisi lebih dari 500 baris kasus. Pecah menjadi beberapa berkas.",
  IMPORT_BATCH_NOT_FOUND: "Ringkasan impor tidak ditemukan.",
};

/** Kode 422 yang berarti seluruh berkas ditolak (csv_import.py dan import_router.py server #157). */
const WHOLE_FILE_CODES: ReadonlySet<string> = new Set([
  "IMPORT_FILE_REQUIRED",
  "IMPORT_FILE_NOT_CSV",
  "IMPORT_FILE_NOT_UTF8",
  "IMPORT_FILE_TOO_LARGE",
  "IMPORT_FILE_UNREADABLE",
  "IMPORT_HEADER_MISMATCH",
  "IMPORT_FILE_EMPTY",
  "IMPORT_TOO_MANY_ROWS",
]);

const FORBIDDEN = "Hanya Kontributor dan Admin yang boleh mengimpor kasus.";
const SERVER_ERROR = "Impor gagal karena kesalahan server. Coba lagi.";
const NETWORK =
  "Tidak bisa terhubung ke server. Periksa koneksi. Bila berkas sudah sempat dikirim, mengunggah ulang aman: " +
  "baris yang sudah masuk dilewati.";
const GENERIC = "Terjadi kesalahan. Coba lagi.";

function apiMessage(error: ApiError): string {
  if (error.status === 403) return FORBIDDEN;
  const fallback = FALLBACK[error.code];
  if (fallback !== undefined) {
    // Pesan kosong atau spasi saja tidak berguna; `??` tidak cukup karena "" bukan null (Sonar S6606).
    const fromServer = error.serverMessage?.trim() ?? "";
    return fromServer === "" ? fallback : fromServer;
  }
  // Batas proxy menjawab 413 berupa halaman HTML, jadi tidak ada kode.
  if (error.status === 413) return TOO_LARGE;
  return SERVER_ERROR;
}

/**
 * Pesan untuk kegagalan impor CSV (PBI-4 SCRUM-340): berkas ditolak utuh (422 IMPORT_*), ringkasan
 * tidak ditemukan, izin, atau koneksi. Pesan server untuk kode yang tidak dikenal tidak ditampilkan.
 */
export function importErrorMessage(error: unknown): string {
  if (error instanceof ApiError) return apiMessage(error);
  // fetch menolak dengan TypeError bila jaringan putus.
  if (error instanceof TypeError) return NETWORK;
  return GENERIC;
}

/** true bila server menolak seluruh berkas (422 IMPORT_*): tidak ada batch, suite, atau kasus yang dibuat (D7). */
export function isFileRejected(error: unknown): boolean {
  return error instanceof ApiError && error.status === 422 && WHOLE_FILE_CODES.has(error.code);
}
