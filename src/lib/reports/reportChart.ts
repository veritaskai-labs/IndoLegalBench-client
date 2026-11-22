import type { ReportRow } from "./reportSections";

/** Teks desimal biasa dari server, misalnya "0.91". Selain itu, termasuk string kosong, dianggap tidak ada skor. */
const DECIMAL_TEXT = /^-?\d+(\.\d+)?$/;
const TICK_FRACTIONS = [0, 0.25, 0.5, 0.75, 1] as const;

export function toNumber(score: string | null): number | null {
  return score !== null && DECIMAL_TEXT.test(score) ? Number(score) : null;
}

/**
 * Ujung sumbu grafik. Skor berskala 0 sampai 1, jadi sumbu berakhir di 1, kecuali server mengirim skor yang
 * lebih besar (sama dengan max(1, ...) di pdf.py). Skor kosong atau rusak tidak ikut dihitung.
 */
export function chartScale(rows: readonly ReportRow[]): number {
  const scores = rows
    .flatMap((row) => [toNumber(row.result.det_score), toNumber(row.result.llm_score)])
    .filter((score): score is number => score !== null);
  return Math.max(1, ...scores);
}

/**
 * Lebar batang dalam persen dari lintasannya. Skor kosong tidak digambar sama sekali (null), bukan batang 0,
 * karena produk itu memang tidak punya skor (Fase 0 K7, D1). Hasilnya selalu di antara 0 dan 100.
 */
export function barPercent(score: string | null, scale: number): number | null {
  const value = toNumber(score);
  if (value === null || scale <= 0) return null;
  return Math.min(100, Math.max(0, (value / scale) * 100));
}

/** Lima label sumbu (0, seperempat, setengah, tiga perempat, ujung) sebagai teks desimal untuk formatScore. */
export function axisTicks(scale: number): string[] {
  return TICK_FRACTIONS.map((fraction) => (fraction * scale).toFixed(2));
}
