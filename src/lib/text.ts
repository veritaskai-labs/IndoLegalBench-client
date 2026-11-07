/**
 * Teks tanpa spasi di ujung, atau null bila kosong atau hanya spasi. Dengan ini pemanggil bisa
 * memakai `??` untuk nilai cadangan: `||` juga menangkap teks kosong, tapi menyamarkan maksudnya
 * (Sonar S6606), sedangkan `??` saja tidak menangkap teks kosong.
 */
export function nonBlankText(text: string | null | undefined): string | null {
  const trimmed = text?.trim();
  return trimmed ? trimmed : null;
}
