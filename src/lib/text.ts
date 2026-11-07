/**
 * Teks tanpa spasi di ujung, atau null bila kosong atau hanya spasi. Dengan ini pemanggil bisa
 * memakai `??` untuk nilai cadangan: `||` juga menangkap teks kosong, tapi menyamarkan maksudnya
 * (Sonar S6606), sedangkan `??` saja tidak menangkap teks kosong. Teks kosong dibandingkan secara
 * eksplisit, bukan lewat truthiness (Sonar S6644).
 */
export function nonBlankText(text: string | null | undefined): string | null {
  const trimmed = text?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}
