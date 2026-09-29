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
  traps:
    "Kesalahan yang sering dibuat model, misalnya memakai aturan yang sudah dicabut. Minimal satu sebelum kasus diajukan review.",
  trapDescription: "Kesalahan apa yang ingin dipancing dari model.",
  trapBehavior: "Opsional. Apa yang seharusnya dilakukan model saat menghadapi jebakan ini.",
  splitTag: "Pilih satu kelompok data untuk kasus ini.",
} as const;
