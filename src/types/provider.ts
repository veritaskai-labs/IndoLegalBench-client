import type { components } from "@/lib/generated/api";

export type AiProduct = components["schemas"]["AiProductRead"];
export type AiProductCreate = components["schemas"]["AiProductCreate"];
export type AiProductUpdate = components["schemas"]["AiProductUpdate"];
export type ConnectionTest = components["schemas"]["ConnectionTestRead"];
export type ConnectionErrorCategory =
  components["schemas"]["ConnectionTestErrorCategory"];
export type ProviderType = components["schemas"]["ProviderType"];
