import type { components } from "@/lib/generated/api";

/** TODO(SCRUM-133): usulan FE; hapus setelah `npm run gen:api`. */
type PendingProductFields = { last_test_error_code?: string | null };
type PendingConnectionFields = { error_code?: string | null };

export type AiProduct = components["schemas"]["AiProductRead"] & PendingProductFields;
export type AiProductCreate = components["schemas"]["AiProductCreate"];
export type AiProductUpdate = components["schemas"]["AiProductUpdate"];
export type ConnectionTest = components["schemas"]["ConnectionTestRead"] & PendingConnectionFields;
export type ProviderType = components["schemas"]["ProviderType"];
