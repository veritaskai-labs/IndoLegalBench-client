import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";
import type { ConnectionErrorCategory } from "@/types/provider";

export type ConnectionFailure = { title: string; hint: string | null };

/** Satu bentuk untuk kedua bahasa, termasuk pesan kategori yang belum dikenal. */
const COPY = messages({
  id: {
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
    fallback: {
      title: "Uji koneksi gagal dengan kode yang belum dikenali aplikasi ini.",
      hint: "Buka Lihat detail untuk pesan asli dari penyedia.",
    },
  },
  en: {
    access_denied: {
      title: "Access was denied because the API key is invalid or no longer valid.",
      hint: "Copy the API key from the provider account again, then paste it into the Credential field with Edit.",
    },
    model_not_found: {
      title: "The address or model name was not found.",
      hint: "Check the endpoint URL and the model name again; both must match the provider documentation exactly.",
    },
    timeout: {
      title: "Timed out. The provider did not respond within 15 seconds.",
      hint: "Try again. Check the endpoint URL.",
    },
    unreachable: {
      title: "The provider server could not be reached.",
      hint: "Check the spelling of the endpoint URL, including the https:// prefix.",
    },
    unknown: {
      title: "The connection test failed. The provider did not give a reason this app recognizes.",
      hint: "Open See details for the original message. The usual causes are a used-up quota or a provider outage.",
    },
    fallback: {
      title: "The connection test failed with a code this app does not recognize yet.",
      hint: "Open See details for the original message from the provider.",
    },
  },
});

/** Diturunkan dari katalog, jadi tidak ada daftar kedua yang bisa basi. */
export const CONNECTION_ERROR_CATEGORIES = Object.keys(COPY.id).filter(
  (key) => key !== "fallback",
) as ConnectionErrorCategory[];

/** hasOwn, bukan `in`: "toString" bukan kategori meski ada di prototipe. */
function isKnownCategory(code: string): code is ConnectionErrorCategory {
  return Object.hasOwn(COPY.id, code) && code !== "fallback";
}

export function describeConnectionFailure(
  code: string | null | undefined,
  locale: Locale = DEFAULT_LOCALE,
): ConnectionFailure {
  const copy = text(COPY, locale);
  return code && isKnownCategory(code) ? copy[code] : copy.fallback;
}
