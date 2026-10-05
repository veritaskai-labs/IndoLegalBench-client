import type { components } from "@/lib/generated/api";

/**
 * TODO(SCRUM-133): field kode error uji koneksi belum ada di OpenAPI server.
 * Nama field dan nilainya masih usulan FE (lihat CONNECTION_ERROR_CODES).
 * Setelah BE merge, jalankan `npm run gen:api` lalu hapus kedua tambahan ini.
 */
type PendingProductFields = { last_test_error_code?: string | null };
type PendingConnectionFields = { error_code?: string | null };

export type AiProduct = components["schemas"]["AiProductRead"] & PendingProductFields;
export type AiProductCreate = components["schemas"]["AiProductCreate"];
export type AiProductUpdate = components["schemas"]["AiProductUpdate"];
export type ConnectionTest = components["schemas"]["ConnectionTestRead"] & PendingConnectionFields;
export type ProviderType = components["schemas"]["ProviderType"];
