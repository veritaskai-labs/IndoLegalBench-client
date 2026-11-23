/**
 * Isi panduan template CSV impor kasus (PBI-4 AC5). Nama kolom harus sama dengan template server; tes
 * membandingkannya dengan deskripsi GET /case-imports/template di contract/openapi.json.
 */
export interface GuideColumn {
  /** Nama kolom persis seperti di baris header template. */
  name: string;
  /** Penjelasan isi kolom. */
  meaning: string;
  /** Contoh isi sel, selalu placeholder sintetis (bukan isi kasus nyata). "" berarti boleh kosong. */
  example: string;
  /** true bila sel berisi list JSON. */
  jsonList: boolean;
}

export const GUIDE_COLUMNS: readonly GuideColumn[] = [];
