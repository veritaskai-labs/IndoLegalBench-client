import { ApiError } from "@/lib/apiClient";
import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";

const REGULATION_TYPE_COPY = messages({
  id: {
    forbidden: "Anda tidak memiliki izin untuk melihat daftar jenis peraturan.",
    fallback: "Gagal memuat daftar jenis peraturan. Coba lagi.",
  },
  en: {
    forbidden: "You do not have permission to view the list of regulation types.",
    fallback: "Could not load the list of regulation types. Try again.",
  },
});

/**
 * Terjemahkan kegagalan memuat daftar jenis peraturan menjadi satu pesan untuk pengguna.
 * Pesan teknis dari server tidak ditampilkan.
 */
export function regulationTypeErrorMessage(error: unknown, locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(REGULATION_TYPE_COPY, locale);
  if (error instanceof ApiError && error.status === 403) return copy.forbidden;
  return copy.fallback;
}
