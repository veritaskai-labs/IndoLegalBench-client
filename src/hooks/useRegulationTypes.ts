"use client";

import { useLocale } from "@/lib/i18n/LocaleProvider";
import { listRegulationTypes } from "@/lib/cases/regulationTypeApi";
import { regulationTypeErrorMessage } from "@/lib/cases/regulationTypeErrors";
import { useAsyncResource } from "./useAsyncResource";

/**
 * Daftar jenis peraturan untuk dropdown rujukan hukum. Dimuat sekali saat dipakai: panggil di
 * tingkat bagian rujukan dan teruskan hasilnya ke tiap baris, jangan di setiap baris. Daftar
 * kosong tetap status ready.
 */
export function useRegulationTypes() {
  const locale = useLocale();
  const { reload, ...resource } = useAsyncResource(
    "regulation-types",
    listRegulationTypes,
    (error) => regulationTypeErrorMessage(error, locale),
  );

  if (resource.status === "ready")
    return { status: "ready" as const, types: resource.data, reload };
  return { ...resource, reload };
}

/** Bentuk hasil hook, untuk komponen yang menerimanya sebagai props. */
export type RegulationTypesResource = ReturnType<typeof useRegulationTypes>;
