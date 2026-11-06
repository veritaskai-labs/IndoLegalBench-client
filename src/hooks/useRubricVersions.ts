"use client";

import { loadErrorMessage } from "@/lib/rubrics/rubricErrors";
import { httpRubricsGateway, type RubricsGateway } from "@/lib/rubrics/rubricsApi";
import { useAsyncResource } from "./useAsyncResource";

/**
 * Semua versi rubrik (PBI-14 AC7). Bergantung pada RubricsGateway yang disuntikkan, jadi test
 * memakai gateway palsu dan implementasi HTTP-nya bisa diganti tanpa menyentuh hook.
 * Daftar kosong sebelum v1 diketik adalah status ready, bukan error.
 */
export function useRubricVersions(gateway: RubricsGateway = httpRubricsGateway) {
  return useAsyncResource("rubric-versions", () => gateway.listVersions(), loadErrorMessage);
}
