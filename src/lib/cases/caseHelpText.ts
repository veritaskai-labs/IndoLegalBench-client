import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";

/**
 * Teks bantuan editor kasus (SCRUM-109, AC6).
 *
 * TODO(SA-1): draf dari aturan SCRUM-103. Ganti dengan teks final dari SA
 * begitu ada; komponen cukup membaca konstanta ini.
 */
const CASE_HELP_TEXT = messages({
  id: {
    identity: "Identitas membuat kasus mudah dicari dan dirujuk di laporan.",
    caseCode: "Kode unik kasus. Huruf, angka, titik, garis bawah, atau tanda hubung.",
    title: "Ringkasan singkat persoalan hukumnya.",
    category: "Opsional. Bidang hukum, misalnya ketenagakerjaan.",
    question: "Pertanyaan persis seperti yang akan dikirim ke produk AI.",
    legalRefs:
      "Dasar hukum jawaban yang benar. Minimal satu rujukan. Pilih seberapa dalam: nama peraturan saja, sampai pasal, atau sampai pasal dan angka. Teks Bebas hanya untuk rujukan yang tidak bisa ditulis terstruktur.",
    answerCriteria:
      "Dipakai untuk menilai jawaban. Isi minimal satu: frasa wajib, frasa terlarang, atau kesimpulan.",
    refForm: "Pilih seberapa dalam rujukan ini menunjuk peraturan.",
    regulationType:
      "Pilih jenis yang spesifik kalau ada, misalnya Peraturan Menteri Keuangan, bukan jenis umum seperti Permen.",
    number: "Nomor peraturan persis seperti di judulnya. Boleh memakai huruf dan angka.",
    year: "Tahun peraturan diundangkan.",
    about: "Judul peraturan setelah kata \"tentang\".",
    pasal: "Nomor pasal, angka biasa atau Romawi, misalnya 156 atau II.",
    angka: "Nomor angka di dalam pasal, angka biasa atau Romawi, misalnya 5 atau IV.",
    ayat: "Ayat di dalam pasal.",
    huruf: "Huruf di dalam ayat.",
    freeText: "Untuk rujukan yang tidak bisa ditulis terstruktur. Disimpan apa adanya.",
    mustContain: "Frasa yang wajib ada di jawaban yang benar. Satu frasa per baris.",
    mustNotContain: "Frasa yang menandakan jawaban salah bila muncul. Satu frasa per baris.",
    expectedConclusion: "Kesimpulan hukum yang seharusnya dicapai jawaban.",
    splitTag:
      "Tag menentukan metodologi dataset (pembagian data dev dan test), bukan tingkat kesulitan kasus.",
  },
  en: {
    identity: "The identity makes a case easy to find and cite in a report.",
    caseCode: "Unique case code. Letters, numbers, dots, underscores, or hyphens.",
    title: "A short summary of the legal issue.",
    category: "Optional. The area of law, for example employment.",
    question: "The question exactly as it will be sent to the AI product.",
    legalRefs:
      "The legal basis of the correct answer. At least one reference. Choose how far it goes: the regulation name only, down to the Pasal, or down to the Pasal and Angka. Free text is only for a reference that cannot be written in a structured form.",
    answerCriteria:
      "Used to score the answer. Fill in at least one: a required phrase, a forbidden phrase, or a conclusion.",
    refForm: "Choose how far this reference points into the regulation.",
    regulationType:
      "Choose a specific type when one exists, for example Peraturan Menteri Keuangan, not a general type such as Permen.",
    number: "The regulation number exactly as it appears in the title. Letters and numbers are allowed.",
    year: "The year the regulation was enacted.",
    about: "The regulation title after the word \"tentang\".",
    pasal: "The Pasal number, ordinary or Roman numerals, for example 156 or II.",
    angka: "The Angka number inside the Pasal, ordinary or Roman numerals, for example 5 or IV.",
    ayat: "The Ayat inside the Pasal.",
    huruf: "The Huruf inside the Ayat.",
    freeText: "For a reference that cannot be written in a structured form. Stored as typed.",
    mustContain: "Phrases that must appear in a correct answer. One phrase per line.",
    mustNotContain: "Phrases that mark an answer as wrong if they appear. One phrase per line.",
    expectedConclusion: "The legal conclusion the answer should reach.",
    splitTag:
      "The tag sets the dataset methodology (how data is split between dev and test), not how hard the case is.",
  },
});

/** Indonesian help text. Existing imports keep reading this. */
export const CASE_HELP = CASE_HELP_TEXT.id;

export function caseHelp(locale: Locale = DEFAULT_LOCALE) {
  return text(CASE_HELP_TEXT, locale);
}

/**
 * Contoh isian yang tampil di kolom kosong (SCRUM-131, masukan UAT #4).
 * Hanya contoh bentuk isian, bukan materi uji.
 */
const CASE_PLACEHOLDER_TEXT = messages({
  id: {
    caseCode: "PHK-001",
    title: "PHK sepihak tanpa pesangon",
    category: "Ketenagakerjaan",
    question: "Apakah perusahaan wajib membayar pesangon jika …?",
    regulationType: "Ketik untuk mencari, misalnya UU",
    number: "13",
    year: "2003",
    about: "Ketenagakerjaan",
    pasal: "156",
    angka: "5",
    ayat: "1",
    huruf: "a",
    freeText: "Tulis rujukan persis seperti aslinya",
    mustContain: "pesangon",
    mustNotContain: "tidak berhak atas pesangon",
    expectedConclusion: "Pekerja berhak atas pesangon.",
  },
  en: {
    caseCode: "PHK-001",
    title: "Unilateral dismissal without severance",
    category: "Employment",
    question: "Must the company pay severance if …?",
    regulationType: "Type to search, for example UU",
    number: "13",
    year: "2003",
    about: "Employment",
    pasal: "156",
    angka: "5",
    ayat: "1",
    huruf: "a",
    freeText: "Write the reference exactly as it appears",
    mustContain: "severance",
    mustNotContain: "not entitled to severance",
    expectedConclusion: "The worker is entitled to severance.",
  },
});

/** Indonesian placeholders. Existing imports keep reading this. */
export const CASE_PLACEHOLDER = CASE_PLACEHOLDER_TEXT.id;

export function casePlaceholder(locale: Locale = DEFAULT_LOCALE) {
  return text(CASE_PLACEHOLDER_TEXT, locale);
}
