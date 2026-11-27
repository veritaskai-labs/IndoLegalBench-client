/** Jeda setelah ketikan terakhir sebelum pencarian dikirim (SCRUM-352, disetujui PO 27 Nov). */
export const SEARCH_DEBOUNCE_MS = 300;

/**
 * Kontrak menerima 1 karakter, tetapi satu huruf cocok dengan hampir semua data dan memaksa server
 * memindai semuanya untuk daftar yang tidak berguna. Aturan klien ini disetujui PO (27 Nov).
 */
export const SEARCH_MIN_CHARS = 2;

/** Sama dengan maxLength parameter q di contract/openapi.json (dijaga oleh tes kontrak). */
export const SEARCH_MAX_CHARS = 200;

export type QueryCheck =
  | { kind: "empty" }
  | { kind: "tooShort" }
  | { kind: "tooLong" }
  | { kind: "ok"; q: string };

export function normaliseQuery(raw: string): QueryCheck {
  throw new Error(`not implemented: ${raw}`);
}
