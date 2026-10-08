/** Kategori gagal uji koneksi; enum-nya di ConnectionTestErrorCategory. */
export const CONNECTION_ERROR_CODES = [
  "access_denied",
  "model_not_found",
  "timeout",
  "unreachable",
  "unknown",
] as const;

export type ConnectionErrorCode = (typeof CONNECTION_ERROR_CODES)[number];

export type ConnectionFailure = { title: string; hint: string | null };

const MESSAGES: Record<ConnectionErrorCode, ConnectionFailure> = {
  access_denied: {
    title: "Akses ditolak karena API key tidak valid atau sudah tidak berlaku.",
    hint: "Salin ulang API key dari akun penyedia, lalu tempel di kolom Kredensial lewat tombol Ubah.",
  },
  model_not_found: {
    title: "Alamat atau nama model tidak ditemukan.",
    hint: "Cek lagi URL endpoint dan nama model; keduanya harus sama persis dengan dokumentasi penyedia.",
  },
  timeout: {
    title: "Waktu habis, penyedia tidak menjawab dalam 15 detik.",
    hint: "Coba lagi. Periksa kembali URL endpoint.",
  },
  unreachable: {
    title: "Server penyedia tidak dapat dijangkau.",
    hint: "Periksa ejaan URL endpoint, termasuk awalan https://.",
  },
  unknown: {
    title: "Uji koneksi gagal. Penyedia tidak memberi alasan yang bisa dikenali.",
    hint: "Buka Lihat detail untuk pesan aslinya. Yang paling sering: kuota habis atau server penyedia sedang gangguan.",
  },
};

/** Dipakai saat server mengirim kategori yang belum ada di MESSAGES. */
const FALLBACK: ConnectionFailure = {
  title: "Uji koneksi gagal dengan kode yang belum dikenali aplikasi ini.",
  hint: "Buka Lihat detail untuk pesan asli dari penyedia.",
};

function isKnownCode(code: string): code is ConnectionErrorCode {
  return (CONNECTION_ERROR_CODES as readonly string[]).includes(code);
}

export function describeConnectionFailure(code: string | null | undefined): ConnectionFailure {
  return code && isKnownCode(code) ? MESSAGES[code] : FALLBACK;
}
