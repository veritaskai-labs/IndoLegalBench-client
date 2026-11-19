import type { ReportResultRead, ReportSessionRead, ScoreSplit } from "@/types/reports";

/** Satu baris tabel: produk (sesi) dan hasil bekunya untuk satu jenis nilai. */
export type ReportRow = {
  session: ReportSessionRead;
  result: ReportResultRead;
};

export type ReportSection = {
  split: ScoreSplit;
  rows: ReportRow[];
};

/** Urutan bagian sama dengan PDF: kasus test, kasus dev, lalu gabungan. */
const SPLIT_ORDER: readonly ScoreSplit[] = ["test", "dev", "combined"];

/**
 * Peringkat dihitung server dan sudah beku (D1); di sini hanya diurutkan. Baris tanpa peringkat (salah satu skor
 * kosong) ditaruh paling akhir. Array.prototype.sort stabil, jadi baris dengan peringkat sama, dan baris tanpa
 * peringkat, tetap dalam urutan server. Kuncinya sama dengan pdf.py supaya web dan PDF berurutan sama.
 */
function byRank(a: ReportRow, b: ReportRow): number {
  if (a.result.rank === null || b.result.rank === null) {
    return Number(a.result.rank === null) - Number(b.result.rank === null);
  }
  return a.result.rank - b.result.rank;
}

function rowsFor(sessions: readonly ReportSessionRead[], split: ScoreSplit): ReportRow[] {
  const rows = sessions.flatMap((session) => {
    const result = session.results.find((item) => item.score_split === split);
    return result ? [{ session, result }] : [];
  });
  return rows.sort(byRank);
}

/**
 * Bagian laporan untuk setiap jenis nilai yang benar-benar dikirim server. Viewer dan Kontributor hanya menerima
 * nilai test (D9), jadi untuk mereka hanya ada satu bagian; FE tidak menyaring per peran sendiri.
 */
export function reportSections(sessions: readonly ReportSessionRead[]): ReportSection[] {
  return SPLIT_ORDER.map((split) => ({ split, rows: rowsFor(sessions, split) })).filter(
    (section) => section.rows.length > 0,
  );
}
