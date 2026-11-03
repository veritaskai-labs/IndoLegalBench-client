import type { components } from "@/lib/generated/api";

export type AiProduct = components["schemas"]["AiProductRead"];
/** Baris GET /admin/providers: AiProductRead ditambah jumlah sesi dan sisa anggaran (SCRUM-210). */
export type AiProductListItem = components["schemas"]["AiProductListItem"];
export type AiProductCreate = components["schemas"]["AiProductCreate"];
export type AiProductUpdate = components["schemas"]["AiProductUpdate"];
export type ConnectionTest = components["schemas"]["ConnectionTestRead"];
export type ConnectionErrorCategory =
  components["schemas"]["ConnectionTestErrorCategory"];
export type ProviderType = components["schemas"]["ProviderType"];
export type MeasurementType = components["schemas"]["MeasurementType"];
export type ModelParams = components["schemas"]["ModelParams"];
export type ProductPurpose = components["schemas"]["ProductPurpose"];
export type AiProductOption = components["schemas"]["AiProductOption"];
