/** TODO(SCRUM-133): samakan dengan enum ConnectionTestErrorCategory. */
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
    title: "Akses ditolak karena API key tidak valid atau sudah tidak berlaku.",
    hint: "Salin ulang API key dari akun penyedia, lalu tempel di kolom Kredensial lewat tombol Ubah.",
  },
  not_found: {
    title: "Alamat atau nama model tidak ditemukan.",
    hint: "Cek lagi URL endpoint dan nama model; keduanya harus sama persis dengan dokumentasi penyedia.",
  },
  rate_limited: {
    title: "Terlalu banyak permintaan, atau kuota akun sudah habis.",
    hint: "Tunggu beberapa menit lalu coba lagi. Kalau masih gagal, cek sisa kuota di akun penyedia.",
  },
  provider_error: {
    title: "Server penyedia sedang mengalami gangguan.",
    hint: "Masalahnya ada di pihak penyedia, bukan di isian Anda. Coba lagi beberapa menit lagi.",
  },
  timeout: {
    title: "Waktu habis, penyedia tidak menjawab dalam 15 detik.",
    hint: "Coba lagi. Periksa kembali URL endpoint.",
  },
  unreachable: {
    title: "Server penyedia tidak dapat dijangkau.",
    hint: "Periksa ejaan URL endpoint, termasuk awalan https://.",
  },
  invalid_response: {
    title: "Penyedia menjawab, tapi formatnya tidak dikenali.",
    hint: "Pastikan Jenis API yang dipilih sesuai dengan penyedia ini.",
  },
  unsupported: {
    title: "Uji koneksi belum tersedia untuk jenis API ini.",
    hint: null,
  },
};

const UNKNOWN: ConnectionFailure = {
  title: "Uji koneksi gagal karena sebab yang belum kami kenali.",
  hint: "Buka Lihat detail untuk melihat pesan asli dari penyedia.",
};

function isKnownCode(code: string): code is ConnectionErrorCode {
  return (CONNECTION_ERROR_CODES as readonly string[]).includes(code);
}

export function describeConnectionFailure(code: string | null | undefined): ConnectionFailure {
  return code && isKnownCode(code) ? MESSAGES[code] : UNKNOWN;
}
