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


/**
 * Karakter kosong yang dibuang server (`app/shared/text.py` BLANK_CHARS), karakter per karakter.
 * trim() JavaScript tidak membuang zero-width space dan beberapa karakter lain di daftar ini,
 * jadi teks yang tampak kosong di layar lolos di form lalu ditolak server dengan 422.
 */
const BLANK_CHARS: ReadonlySet<string> = new Set(
  "\t\n\u000b\u000c\r\u001c\u001d\u001e\u001f " +
    "\u0085\u00a0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200a" +
    "\u2028\u2029\u202f\u205f\u3000" +
    "\u180e\u200b\u200c\u200d\u2060\ufeff",
);

/**
 * Buang karakter kosong, termasuk yang tak terlihat, dari kedua tepi, sama dengan strip_blank
 * di server. Hanya di tepi: zero-width joiner di dalam emoji tetap utuh. Semua karakter di
 * daftar satu unit UTF-16, jadi indeks string biasa cukup.
 */
export function stripBlank(text: string): string {
  let start = 0;
  let end = text.length;
  while (start < end && BLANK_CHARS.has(text[start])) start += 1;
  while (end > start && BLANK_CHARS.has(text[end - 1])) end -= 1;
  return text.slice(start, end);
}
