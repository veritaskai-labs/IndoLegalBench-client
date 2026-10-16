import type { components } from "@/lib/generated/api";

/**
 * Satu jenis peraturan dari GET /regulation-types: kode yang dikirim ke server (tidak pernah
 * berubah), label, singkatan bila ada (mis. "UU" atau "Permen"), dan apakah masih aktif.
 */
export type RegulationType = components["schemas"]["RegulationTypeRead"];
