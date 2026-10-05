/**
 * Pesan uji koneksi untuk Admin (SCRUM-134 #1). Server mengirim kode kategori;
 * pesan mentah dari penyedia hanya muncul di "Lihat detail".
 *
 * TODO(SCRUM-133): daftar kode ini usulan FE dan belum disepakati BE.
 * Samakan dengan enum di OpenAPI begitu tersedia.
 */
export const CONNECTION_ERROR_CODES = [
  "auth_failed",
  "not_found",
  "rate_limited",
  "provider_error",
  "timeout",
  "unreachable",
  "invalid_response",
  "unsupported",
] as const;

export type ConnectionErrorCode = (typeof CONNECTION_ERROR_CODES)[number];

export type ConnectionFailure = { title: string; hint: string | null };

const MESSAGES: Record<ConnectionErrorCode, ConnectionFailure> = {
  auth_failed: {
    title: "API key ditolak penyedia.",
    hint: "Periksa kembali API key, lalu simpan ulang lewat tombol Ubah.",
  },
  not_found: {
    title: "Penyedia tidak mengenali alamat endpoint atau nama modelnya.",
    hint: "Cocokkan URL endpoint dan nama model dengan dokumentasi penyedia.",
  },
  rate_limited: {
    title: "Penyedia sedang membatasi permintaan, atau kuota akun sudah habis.",
    hint: "Tunggu beberapa menit, atau cek sisa kuota di dashboard penyedia.",
  },
  provider_error: {
    title: "Server penyedia sedang bermasalah; isian Anda kemungkinan sudah benar.",
    hint: "Uji lagi beberapa menit lagi.",
  },
  timeout: {
    title: "Penyedia tidak menjawab dalam 15 detik.",
    hint: "Coba sekali lagi. Kalau tetap lambat, periksa URL endpoint.",
  },
  unreachable: {
    title: "Server penyedia tidak bisa dihubungi.",
    hint: "Periksa ejaan URL endpoint, termasuk awalan https://.",
  },
  invalid_response: {
    title: "Penyedia menjawab, tapi formatnya tidak cocok dengan jenis API yang dipilih.",
    hint: "Pastikan jenis API sesuai dengan endpoint ini.",
  },
  unsupported: {
    title: "Uji koneksi belum tersedia untuk jenis API ini.",
    hint: null,
  },
};

const UNKNOWN: ConnectionFailure = {
  title: "Uji koneksi gagal dan penyebabnya belum bisa kami kenali.",
  hint: "Buka Lihat detail untuk pesan asli dari penyedia.",
};

function isKnownCode(code: string): code is ConnectionErrorCode {
  return (CONNECTION_ERROR_CODES as readonly string[]).includes(code);
}

export function describeConnectionFailure(code: string | null | undefined): ConnectionFailure {
  return code && isKnownCode(code) ? MESSAGES[code] : UNKNOWN;
}
