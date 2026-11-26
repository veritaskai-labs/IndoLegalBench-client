/**
 * Teks bantuan form versi rubrik (SCRUM-279, PBI-14 AC7, masukan UAT klien K-09 dan K-10).
 * Semua redaksi ada di sini supaya komponen cukup membaca konstanta ini.
 *
 * Catatan "Nama penyetuju" menunggu konfirmasi klien sebelum merge.
 */
export const RUBRIC_HELP = {
  effectiveDate: "Tanggal versi rubrik ini mulai dipakai untuk penilaian.",
  approvedByName: "Nama orang dari tim legal yang menyetujui versi rubrik ini. Boleh dikosongkan.",
  approvedAt: "Tanggal versi rubrik ini disetujui. Boleh dikosongkan bila belum ada.",
  judgePromptQuality: "Instruksi untuk penilai LLM saat menilai kualitas jawaban.",
  judgePromptFormat: "Instruksi untuk penilai LLM saat menilai kesesuaian format jawaban.",
  /** Satu catatan untuk seluruh tabel skala (SCRUM-375 B2), bukan enam catatan yang sama. */
  scale: "Beri nama tiap skor. Nama ini tampil di hasil penilaian. Centang Lulus untuk skor yang dianggap lulus.",
  /** Satu catatan untuk keenam deskripsi skor (B3); nama tiap skor tampil di samping isiannya. */
  descriptors: "Ciri jawaban yang pantas mendapat skor tiap skor. Nama skor diambil dari Skala nilai.",
  aspectName: "Nama singkat aspek yang dinilai.",
  aspectPath: "Deterministik dinilai dengan aturan tetap, LLM judge dinilai oleh model penilai.",
  aspectWeight: "Bobot aspek ini terhadap skor akhir, berupa angka. Kosongkan bila tanpa bobot.",
  aspectDefinition: "Penjelasan arti aspek ini bagi penilai.",
} as const;

/**
 * Contoh isian di kolom kosong. Hanya contoh bentuk isian, bukan materi uji.
 * Isian tanggal tidak punya contoh karena browser sudah menampilkan formatnya sendiri.
 */
export const RUBRIC_PLACEHOLDER = {
  approvedByName: "Nama anggota tim legal",
  judgePromptQuality: "Contoh: Nilai apakah jawaban menjawab pertanyaan hukum dengan benar dan lengkap.",
  judgePromptFormat: "Contoh: Nilai apakah jawaban tersusun runtut dan mudah dibaca.",
  levelLabel: "Contoh: Sempurna dan Komprehensif",
  aspectName: "Contoh: Kesimpulan",
  aspectWeight: "Contoh: 25",
  aspectDefinition: "Contoh: Ketepatan kesimpulan akhir jawaban.",
  descriptor: "Contoh: Kesimpulan benar dan didukung dasar hukum yang tepat.",
} as const;
