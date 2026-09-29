/**
 * Teks bantuan editor kasus (SCRUM-109, AC6).
 *
 * TODO(SA-1): draf dari aturan SCRUM-103. Ganti dengan teks final dari SA
 * begitu ada; komponen cukup membaca konstanta ini.
 */
export const CASE_HELP = {
  identity: "Identitas membuat kasus mudah dicari dan dirujuk di laporan.",
  caseCode: "Kode unik kasus, misalnya PHK-001. Huruf, angka, titik, garis bawah, atau tanda hubung.",
  title: "Ringkasan singkat persoalan hukumnya.",
  category: "Opsional. Bidang hukum, misalnya ketenagakerjaan.",
  question: "Pertanyaan persis seperti yang akan dikirim ke produk AI.",
  legalRefs: "Dasar hukum jawaban yang benar. Minimal satu rujukan, sampai tingkat pasal.",
  answerCriteria:
    "Dipakai untuk menilai jawaban. Isi minimal satu: frasa wajib, frasa terlarang, atau kesimpulan.",
  regulationType: "Jenis peraturan, misalnya UU, PP, Perpres, atau Permen.",
  regulationNumber: "Nomor peraturan persis seperti di judulnya, misalnya 13.",
  year: "Opsional. Tahun peraturan diundangkan, misalnya 2003.",
  pasal: "Wajib. Rujukan harus sampai tingkat pasal, misalnya 151.",
  ayat: "Opsional. Ayat di dalam pasal, misalnya 3.",
  huruf: "Opsional. Huruf di dalam ayat, misalnya b.",
  mustContain: "Frasa yang wajib ada di jawaban yang benar. Satu frasa per baris.",
  mustNotContain: "Frasa yang menandakan jawaban salah bila muncul. Satu frasa per baris.",
  expectedConclusion: "Kesimpulan hukum yang seharusnya dicapai jawaban.",
  traps:
    "Jebakan adalah skenario yang menguji ketelitian jawaban model: detail yang mudah terlewat atau godaan untuk salah, misalnya memakai aturan yang sudah dicabut. Minimal satu sebelum kasus diajukan review.",
  trapDescription: "Kesalahan apa yang ingin dipancing dari model, dan di bagian mana ia biasanya keliru.",
  trapBehavior: "Opsional. Apa yang seharusnya dilakukan model saat menghadapi jebakan ini.",
  splitTag:
    "Tag menentukan metodologi dataset (pembagian data dev dan test), bukan tingkat kesulitan kasus.",
} as const;
