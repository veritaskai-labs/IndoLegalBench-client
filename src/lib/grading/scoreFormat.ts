/** Angka desimal biasa seperti "3.75" atau "4": tanpa koma, eksponen, atau spasi. */
const DECIMAL_TEXT = /^-?\d+(\.\d+)?$/;

function isDecimalText(value: string): value is `${number}` {
  return DECIMAL_TEXT.test(value);
}

const TWO_DIGITS = { minimumFractionDigits: 2, maximumFractionDigits: 2 } as const;

/**
 * Dua digit di belakang koma (PBI-14 AC3), cara Indonesia atau Inggris. String diberikan langsung ke Intl, yang
 * membacanya sebagai desimal persis dan membulatkan setengah ke atas seperti ROUND_HALF_UP di server,
 * jadi tidak ada galat float. Formatter dibuat sekali per bahasa karena pembuatannya mahal.
 */
const SCORE = {
  id: new Intl.NumberFormat("id-ID", TWO_DIGITS),
  en: new Intl.NumberFormat("en-US", TWO_DIGITS),
};

/** Bahasa angka: Indonesia untuk seluruh aplikasi, Inggris untuk laporan berbahasa Inggris (SCRUM-322). */
export type ScoreLanguage = keyof typeof SCORE;

/**
 * Skor dari server (Decimal dikirim sebagai string). null berarti tidak dinilai, dan tampil sebagai tanda pisah.
 * Laporan perbandingan memberi bahasa laporannya supaya angka di web sama dengan di PDF (Fase 0 K3).
 */
export function formatScore(value: string | null | undefined, language: ScoreLanguage = "id"): string {
  if (value == null || !isDecimalText(value)) return "–";
  return SCORE[language].format(value);
}
