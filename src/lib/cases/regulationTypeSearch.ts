// Pencarian jenis peraturan di dropdown rujukan hukum (PBI-21, AC2).
//
// Logika murni, tanpa React dan tanpa API. Daftar yang masuk sudah diurutkan server menurut
// urutan resmi, dan urutan itu dipertahankan di antara hasil yang peringkatnya sama.

import type { RegulationType } from "@/types/regulationType";

/** Huruf kecil, tanda hubung, garis bawah, dan garis miring jadi spasi, spasi berlebih dibuang. */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Setiap kata query harus menjadi awal salah satu kata di teks ("menteri" tidak cocok "kementerian"). */
function startsEveryWord(words: readonly string[], text: string): boolean {
  const tokens = text.split(" ");
  return words.every((word) => tokens.some((token) => token.startsWith(word)));
}

/**
 * Peringkat satu jenis untuk query, atau null bila tidak cocok. Makin kecil makin atas:
 * 0 singkatan atau kode persis, 1 label diawali query, 2 semua kata ada di label,
 * 3 semua kata ada di label, kode, atau singkatan.
 */
function rank(type: RegulationType, query: string, words: readonly string[]): number | null {
  const label = normalize(type.label);
  const code = normalize(type.code);
  const abbreviation = type.singkatan === null ? "" : normalize(type.singkatan);

  if (query === abbreviation || query === code) return 0;
  if (label.startsWith(query)) return 1;
  if (startsEveryWord(words, label)) return 2;
  if (startsEveryWord(words, [label, code, abbreviation].join(" "))) return 3;
  return null;
}

/** Jenis yang cocok dengan query, peringkat terbaik dulu. Query kosong mengembalikan semuanya. */
export function searchRegulationTypes(
  types: readonly RegulationType[],
  query: string,
): RegulationType[] {
  const normalized = normalize(query);
  if (normalized === "") return [...types];

  const words = normalized.split(" ");
  return types
    .map((type, index) => ({ type, index, rank: rank(type, normalized, words) }))
    .filter((match): match is { type: RegulationType; index: number; rank: number } => {
      return match.rank !== null;
    })
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map((match) => match.type);
}
