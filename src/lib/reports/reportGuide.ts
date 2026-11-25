/**
 * Penjelasan istilah laporan untuk pembaca non-teknis (SCRUM-346 temuan N5, A5 dan ikon info di header tabel,
 * disetujui PO 25 Nov). Satu sumber untuk tooltip kolom dan panel "Cara membaca laporan ini", supaya keduanya
 * tidak berbeda. Isinya dari aturan PRD Sprint 4 PBI-15 dan PBI-16; bagian aplikasi, jadi selalu Indonesia.
 */
export type GuideKey = "rank" | "deterministic" | "llm" | "graded" | "failureRate" | "markers";

export type GuideEntry = { term: string; text: string };

export const COLUMN_GUIDE: Readonly<Record<GuideKey, GuideEntry>> = {
  rank: {
    term: "Peringkat",
    text: "Produk diurutkan menurut skor. Tidak ada target skor atau nilai acuan.",
  },
  deterministic: {
    term: "Skor deterministik",
    text: "Skor jalur rujukan peraturan dan pasal, angka desimal dua digit. Ditampilkan terpisah dari skor penilai LLM dan tidak digabung.",
  },
  llm: {
    term: "Skor penilai LLM",
    text: "Skor dari model penilai memakai rubrik yang versinya tertulis di bawah judul laporan.",
  },
  graded: {
    term: "Kasus dinilai",
    text: "Perbandingan hanya dihitung pada kasus yang dijawab semua produk yang dibandingkan. Jumlah dasarnya tertulis di bawah judul.",
  },
  failureRate: {
    term: "Tingkat kegagalan",
    text: "Tingkat kegagalan teknis pemanggilan, dihitung dari semua upaya termasuk percobaan ulang. Bukan jawaban salah, dan tidak berlaku untuk produk manual.",
  },
  markers: {
    term: "Penanda",
    text: "Uji coba: sesi uji coba. Versi model berbeda: versi model produk berbeda antarsesi. Jumlah percobaan berbeda: sesi manual dengan jumlah percobaan tidak sama.",
  },
};

/** Urutan panel: kolom tabel dari kiri ke kanan, lalu aturan yang tidak punya kolom sendiri. */
export const REPORT_GUIDE: readonly GuideEntry[] = [
  ...Object.values(COLUMN_GUIDE),
  {
    term: "Skor dev dan test",
    text: "Skor resmi hanya dari kasus test. Laporan dengan skor dev hanya untuk internal dan tidak bisa diterbitkan.",
  },
];
