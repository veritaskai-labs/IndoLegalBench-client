import type { VersionCompare, VersionSections } from "@/types/caseVersion";
import { SECTION_KEYS, sectionLabel, sectionLines } from "./versionSections";

type SectionKey = keyof VersionSections;

/**
 * Bagian yang dibandingkan di tabel compare. ID kasus tidak ikut: server mengunci case_code setelah
 * ada versi yang disetujui dan versi baru menyalin kode versi itu, jadi dua versi yang bisa
 * dibandingkan selalu punya ID kasus yang sama (K-05).
 */
export const COMPARE_SECTION_KEYS: SectionKey[] = SECTION_KEYS.filter((key) => key !== "case_code");

const NOTHING_CHANGED = "Tidak ada bagian yang berubah di antara kedua versi.";

/**
 * Ringkasan di atas tabel, misalnya "2 bagian berubah: Kategori, Pengurang Poin." Urutannya
 * mengikuti tabel, bukan urutan dari server. Nama yang belum dikenal client tetap disebut di akhir
 * supaya perubahan dari server yang lebih baru tidak hilang diam-diam.
 */
export function changeSummary(changed: readonly string[]): string {
  const names = new Set(changed);
  const known = COMPARE_SECTION_KEYS.filter((key) => names.has(key));
  const unknown = [...names].filter((name) => name !== "case_code" && !SECTION_KEYS.includes(name as SectionKey));
  const labels = [...known, ...unknown].map(sectionLabel);
  if (labels.length === 0) return NOTHING_CHANGED;
  return `${labels.length} bagian berubah: ${labels.join(", ")}.`;
}

/** both: baris yang sama ada di kedua versi. only_a / only_b: hanya ada di satu versi. */
export type LineMark = "both" | "only_a" | "only_b";
export type MarkedLine = { text: string; mark: LineMark };

/** Tandai baris satu sisi: baris yang masih punya pasangan di sisi lain dihitung "both", satu lawan satu. */
function markSide(lines: readonly string[], other: readonly string[], onlyHere: LineMark): MarkedLine[] {
  const unmatched = new Map<string, number>();
  for (const line of other) unmatched.set(line, (unmatched.get(line) ?? 0) + 1);
  return lines.map((text) => {
    const left = unmatched.get(text) ?? 0;
    if (left === 0) return { text, mark: onlyHere };
    unmatched.set(text, left - 1);
    return { text, mark: "both" };
  });
}

/**
 * Baris mana di satu bagian yang hanya ada di salah satu versi. Perbandingannya per baris utuh
 * (multiset), bukan urutan: baris yang sama dengan urutan berbeda tidak dianggap beda isi.
 * Cukup untuk daftar rujukan, kriteria, dan pengurang poin yang memang ditampilkan per baris.
 */
export function compareLines(a: readonly string[], b: readonly string[]): { a: MarkedLine[]; b: MarkedLine[] } {
  return { a: markSide(a, b, "only_a"), b: markSide(b, a, "only_b") };
}

const unmarked = (lines: string[]): MarkedLine[] => lines.map((text) => ({ text, mark: "both" }));

/**
 * Isi satu bagian di kedua sisi, siap ditampilkan. Baris hanya ditandai bila server menyebut bagian
 * itu berubah, jadi tampilan tidak pernah menandai beda yang tidak dilaporkan server.
 */
export function markedSectionLines(key: SectionKey, result: VersionCompare): { a: MarkedLine[]; b: MarkedLine[] } {
  const a = sectionLines(key, result.a.sections);
  const b = sectionLines(key, result.b.sections);
  return result.changed.includes(key) ? compareLines(a, b) : { a: unmarked(a), b: unmarked(b) };
}

/**
 * Key React yang stabil untuk tiap baris tanpa memakai posisi array: teks dan tandanya, ditambah
 * urutan kemunculan supaya dua baris yang sama persis tetap punya key berbeda.
 */
export function keyedLines(lines: readonly MarkedLine[]): { key: string; line: MarkedLine }[] {
  const seen = new Map<string, number>();
  return lines.map((line) => {
    const base = `${line.mark}:${line.text}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return { key: `${base}:${count}`, line };
  });
}
