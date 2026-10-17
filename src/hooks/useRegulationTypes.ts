"use client";

import { listRegulationTypes } from "@/lib/cases/regulationTypeApi";
import { regulationTypeErrorMessage } from "@/lib/cases/regulationTypeErrors";
import { useAsyncResource } from "./useAsyncResource";

/**
 * Daftar jenis peraturan untuk dropdown rujukan hukum. Dimuat sekali saat dipakai: panggil di
 * tingkat bagian rujukan dan teruskan hasilnya ke tiap baris, jangan di setiap baris. Daftar
 * kosong tetap status ready.
 */
export function useRegulationTypes() {
  const { reload, ...resource } = useAsyncResource(
    "regulation-types",
    listRegulationTypes,
    regulationTypeErrorMessage,
  );

  if (resource.status === "ready")
    return { status: "ready" as const, types: resource.data, reload };
  return { ...resource, reload };
}

/** Bentuk hasil hook, untuk komponen yang menerimanya sebagai props. */
export type RegulationTypesResource = ReturnType<typeof useRegulationTypes>;
