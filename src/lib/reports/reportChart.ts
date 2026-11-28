/** Teks desimal biasa dari server, misalnya "0.91". Selain itu, termasuk string kosong, dianggap tidak ada skor. */
const DECIMAL_TEXT = /^-?\d+(\.\d+)?$/;
const TICK_FRACTIONS = [0, 0.25, 0.5, 0.75, 1] as const;

export function toNumber(score: string | null): number | null {
  return score !== null && DECIMAL_TEXT.test(score) ? Number(score) : null;
}

/** Lima label sumbu (0, seperempat, setengah, tiga perempat, ujung) sebagai teks desimal untuk formatScore. */
export function axisTicks(scale: number): string[] {
  return TICK_FRACTIONS.map((fraction) => (fraction * scale).toFixed(2));
}
