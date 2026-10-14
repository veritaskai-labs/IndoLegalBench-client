"use client";

import { ApiError } from "@/lib/apiClient";
import { getOpenCaseVersion } from "@/lib/cases/versionApi";
import { mapVersionError } from "@/lib/cases/versionErrors";
import type { CaseRead } from "@/types/case";
import { useAsyncResource } from "./useAsyncResource";

const NO_OPEN_VERSION = "NO_OPEN_VERSION";

const openMessage = (error: unknown) => mapVersionError(error, "open");

/** Kasus yang hanya punya versi disetujui itu wajar, jadi "tidak ada versi terbuka" bukan error. */
function noDraftAsNull(error: unknown): null {
  if (error instanceof ApiError && error.status === 404 && error.code === NO_OPEN_VERSION) {
    return null;
  }
  throw error;
}

/**
 * Draf atau versi yang sedang dikerjakan, supaya halaman edit bisa membukanya lagi setelah dimuat
 * ulang: GET kasus selalu mengembalikan versi yang disetujui. Draf yang ditemukan diserahkan ke
 * onFound, karena halaman harus mengisi form dari draf itu, bukan dari GET.
 *
 * Server hanya menjawab pembuat kasus dan admin, dan setiap 403 memindahkan pengguna ke /forbidden,
 * jadi pemanggil mengisi enabled hanya untuk mereka. Bila enabled false, tidak ada permintaan.
 */
export function useOpenDraft(caseId: string, enabled: boolean, onFound: (draft: CaseRead) => void) {
  return useAsyncResource<CaseRead | null>(
    `${caseId}|${enabled}`,
    async () => {
      if (!enabled) return null;
      const draft = await getOpenCaseVersion(caseId).catch(noDraftAsNull);
      // Balasan lambat milik kasus lain tidak boleh menimpa kasus yang sedang tampil.
      if (draft !== null && draft.id === caseId) onFound(draft);
      return draft;
    },
    openMessage,
  );
}
