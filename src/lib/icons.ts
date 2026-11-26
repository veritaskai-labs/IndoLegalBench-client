/** Line icons from the approved prototype (Final UI ILB), drawn on a 24 px grid. */
export const ICON = {
  beranda: "M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z",
  suite: "M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",
  tinjauan: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6",
  antrean: "M22 12h-6l-2 3h-4l-2-3H2M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1",
  rubrik: "M9 6h12M9 12h12M9 18h12M3 6l1.5 1.5L7 5M3 12l1.5 1.5L7 11M3 18l1.5 1.5L7 17",
  produk: "M12 2 3 7v10l9 5 9-5V7zM3 7l9 5 9-5M12 12v10",
  otomatis: "M6 4l14 8-14 8z",
  manual: "M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z",
  laporan: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  pengguna:
    "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8",
  riwayat: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  panel: "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2M9 3v18",
  ciutkan: "M11 17l-5-5 5-5M18 17l-5-5 5-5",
  lebarkan: "M13 17l5-5-5-5M6 17l5-5-5-5",
  keluar: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9",
  lonceng: "M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0",
  muatUlang: "M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5",
  info: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 11v5M12 8v.5",
  peringatan: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M12 7v6M12 16.5v.5",
  panahKanan: "M5 12h14M13 6l6 6-6 6",
  unduh: "M12 3v12M7 10l5 5 5-5M5 21h14",
  cari: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-3.5-3.5",
  tambah: "M12 5v14M5 12h14",
  centang: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M8 12.5l2.5 2.5L16 9.5",
  lingkaran: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
  silang: "M18 6 6 18M6 6l12 12",
  kunci: "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2M7 11V7a5 5 0 0 1 10 0v4",
  kalender: "M8 2v4M16 2v4M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2M3 10h18",
} as const;

export type IconName = keyof typeof ICON;
