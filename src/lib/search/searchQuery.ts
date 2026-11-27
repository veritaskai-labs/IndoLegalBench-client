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

/**
 * Rapikan kata kunci seperti server (spasi di kedua ujung dibuang dulu, baru panjangnya dihitung) dan
 * putuskan apakah layak dikirim. Panjang dihitung per karakter Unicode, sama dengan len() di Python,
 * bukan per unit UTF-16 seperti String.length.
 */
export function normaliseQuery(raw: string): QueryCheck {
  const q = raw.trim();
  const length = [...q].length;
  if (length === 0) return { kind: "empty" };
  if (length < SEARCH_MIN_CHARS) return { kind: "tooShort" };
  if (length > SEARCH_MAX_CHARS) return { kind: "tooLong" };
  return { kind: "ok", q };
}
