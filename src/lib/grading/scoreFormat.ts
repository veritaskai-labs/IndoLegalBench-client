/** Angka desimal biasa seperti "3.75" atau "4": tanpa koma, eksponen, atau spasi. */
const DECIMAL_TEXT = /^-?\d+(\.\d+)?$/;

function isDecimalText(value: string): value is `${number}` {
  return DECIMAL_TEXT.test(value);
}

/**
 * Dua digit di belakang koma, cara Indonesia (PBI-14 AC3). String diberikan langsung ke Intl, yang
 * membacanya sebagai desimal persis dan membulatkan setengah ke atas seperti ROUND_HALF_UP di server,
 * jadi tidak ada galat float. Satu formatter dipakai ulang karena pembuatannya mahal.
 */
const SCORE = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** Skor dari server (Decimal dikirim sebagai string). null berarti tidak dinilai, dan tampil sebagai tanda pisah. */
export function formatScore(value: string | null | undefined): string {
  if (value == null || !isDecimalText(value)) return "–";
  return SCORE.format(value);
}
