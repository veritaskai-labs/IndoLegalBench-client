import { ApiError, type MissingSection } from "@/lib/apiClient";
import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";

const SUBMIT_COPY = messages({
  id: {
    notSubmittable: "Versi ini sedang ditinjau atau sudah disetujui.",
    suiteInactive: "Suite ini tidak aktif, jadi kasusnya belum bisa diajukan.",
    notReady: "Kasus belum lengkap. Lengkapi bagian berikut dulu.",
    notRevised:
      "Kasus ini belum bisa diajukan ulang karena belum ada putusan revisi. Hubungi Admin.",
    forbidden: "Hanya penulis kasus ini yang bisa mengajukannya untuk direview.",
    notFound: "Kasus tidak ditemukan.",
    fallback: "Gagal mengajukan kasus. Coba lagi.",
  },
  en: {
    notSubmittable: "This version is in review or already approved.",
    suiteInactive: "This suite is not active, so its case cannot be submitted yet.",
    notReady: "The case is not complete. Finish the following parts first.",
    notRevised:
      "This case cannot be submitted again because there is no revision decision yet. Contact an admin.",
    forbidden: "Only the author of this case can submit it for review.",
    notFound: "The case was not found.",
    fallback: "Could not submit the case. Try again.",
  },
});

export function mapSubmitError(error: unknown, locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(SUBMIT_COPY, locale);
  if (!(error instanceof ApiError)) return copy.fallback;

  if (error.code === "VERSION_NOT_SUBMITTABLE") return copy.notSubmittable;
  if (error.code === "SUITE_NOT_ACTIVE") return copy.suiteInactive;
  if (error.code === "CASE_NOT_READY") return copy.notReady;
  if (error.code === "ROUND_NOT_REVISED") return copy.notRevised;
  if (error.status === 403) return copy.forbidden;
  if (error.status === 404) return copy.notFound;
  return copy.fallback;
}

/** Bagian yang menghalangi pengajuan, ditampilkan satu per satu (AC1). */
export function submitBlockers(error: unknown): MissingSection[] {
  return error instanceof ApiError ? error.missing : [];
}

/** 409 yang artinya versi ini sudah diajukan atau disetujui, jadi halaman perlu dibaca ulang. */
export function isStaleSubmit(error: unknown): boolean {
  return error instanceof ApiError && error.code === "VERSION_NOT_SUBMITTABLE";
}
