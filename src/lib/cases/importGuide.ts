/**
 * Isi panduan template CSV impor kasus (PBI-4 AC5). Nama kolom harus sama dengan template server; tes
 * membandingkannya dengan deskripsi GET /case-imports/template di contract/openapi.json.
 * Batas panjang teks tidak ditulis di sini: itu aturan server, dan baris yang melanggar dilaporkan gagal.
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

export const GUIDE_COLUMNS: readonly GuideColumn[] = [
  { name: "title", meaning: "Judul kasus.", example: "Contoh judul kasus", jsonList: false },
  { name: "question", meaning: "Pertanyaan hukum yang diajukan ke AI.", example: "Contoh pertanyaan hukum?", jsonList: false },
  { name: "category", meaning: "Kategori, teks bebas.", example: "Contoh kategori", jsonList: false },
  {
    name: "split_tag",
    meaning: "Isi dev, test, atau biarkan kosong. Tag boleh ditentukan setelah impor.",
    example: "",
    jsonList: false,
  },
  {
    name: "legal_refs",
    meaning:
      "List JSON rujukan hukum. Tiap isi boleh teks biasa; rincian terstruktur (jenis, nomor, tahun, pasal) " +
      "paling mudah dilengkapi di editor kasus setelah impor.",
    example: '["Pasal 1 Undang-Undang Contoh", "Contoh rujukan kedua"]',
    jsonList: true,
  },
  {
    name: "must_contain",
    meaning: "List JSON frasa yang wajib ada di jawaban.",
    example: '["frasa pertama", "frasa kedua"]',
    jsonList: true,
  },
  {
    name: "must_not_contain",
    meaning: "List JSON frasa yang tidak boleh ada di jawaban.",
    example: '["frasa terlarang"]',
    jsonList: true,
  },
  {
    name: "expected_conclusion",
    meaning: "Kesimpulan jawaban yang diharapkan, teks.",
    example: "Contoh kesimpulan",
    jsonList: false,
  },
];
