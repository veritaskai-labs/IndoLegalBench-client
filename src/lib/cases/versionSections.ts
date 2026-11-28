import { DEFAULT_LOCALE, fill, messages, text, type Locale } from "@/lib/i18n/locale";
import type { VersionSections } from "@/types/caseVersion";

type SectionKey = keyof VersionSections;

type SectionView = {
  /** Isi bagian ini sebagai baris teks untuk tampilan berdampingan. Kosong berarti bagian itu tidak terisi. */
  lines: (sections: VersionSections, locale: Locale) => string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Kontrak menulis isi bagian ini sebagai unknown, jadi tiap nilai dipersempit dulu sebelum ditampilkan. */
function shown(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(shown).filter((item) => item !== "") : [];
}

function single(value: unknown): string[] {
  const line = shown(value);
  return line === "" ? [] : [line];
}

const LINE_COPY = messages({
  id: {
    structuredMissing: "Rujukan terstruktur, teks penulisannya belum tersedia di tampilan ini.",
    year: "Tahun",
    mustContain: "Wajib ada: {phrases}",
    mustNotContain: "Tidak boleh ada: {phrases}",
    conclusion: "Kesimpulan: {text}",
    firstVersion: "Versi pertama",
    nothingChanged: "Tidak ada bagian yang berubah",
  },
  en: {
    structuredMissing: "Structured reference; the written text is not available in this view.",
    year: "Year",
    mustContain: "Must include: {phrases}",
    mustNotContain: "Must not include: {phrases}",
    conclusion: "Conclusion: {text}",
    firstVersion: "First version",
    nothingChanged: "No section changed",
  },
});

/** "UU No. 13 Tahun 2003, Pasal 151 ayat (3) huruf a". Bagian yang kosong dilewati. */
function legacyRefLine(ref: Record<string, unknown>, locale: Locale): string | null {
  const year = text(LINE_COPY, locale).year;
  const regulation = [
    shown(ref.regulation_type),
    shown(ref.regulation_number) && `No. ${shown(ref.regulation_number)}`,
    shown(ref.year) && `${year} ${shown(ref.year)}`,
  ]
    .filter(Boolean)
    .join(" ");
  const provision = [
    shown(ref.pasal) && `Pasal ${shown(ref.pasal)}`,
    shown(ref.ayat) && `ayat (${shown(ref.ayat)})`,
    shown(ref.huruf) && `huruf ${shown(ref.huruf)}`,
  ]
    .filter(Boolean)
    .join(" ");
  const line = [regulation, provision].filter(Boolean).join(", ");
  return line === "" ? null : line;
}

/**
 * Satu baris untuk satu rujukan. Teks yang ditulis server dipakai apa adanya, jadi aturan penulisan
 * rujukan hanya ada di server. Tanpa itu: teks bebas ditampilkan seperti diketik, bentuk lama
 * (Sprint 1) ditulis seperti biasa, dan bentuk baru tanpa teks diberi baris pengganti supaya tidak
 * hilang diam-diam dari tampilan.
 */
function legalRefLine(ref: unknown, locale: Locale): string | null {
  if (!isRecord(ref)) return null;
  const written = typeof ref.display_text === "string" ? ref.display_text.trim() : "";
  if (written !== "") return written;
  if (ref.kind === "free_text") return shown(ref.free_text) || null;
  if (ref.kind === "structured") return text(LINE_COPY, locale).structuredMissing;
  return legacyRefLine(ref, locale);
}

function legalRefLines(value: unknown, locale: Locale): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((ref) => legalRefLine(ref, locale)).filter((line): line is string => line !== null);
}

function answerCriteriaLines(value: unknown, locale: Locale): string[] {
  if (!isRecord(value)) return [];
  const copy = text(LINE_COPY, locale);
  const mustContain = textList(value.must_contain);
  const mustNotContain = textList(value.must_not_contain);
  const conclusion = shown(value.expected_conclusion);
  return [
    mustContain.length > 0 ? fill(copy.mustContain, { phrases: mustContain.join("; ") }) : "",
    mustNotContain.length > 0 ? fill(copy.mustNotContain, { phrases: mustNotContain.join("; ") }) : "",
    conclusion !== "" ? fill(copy.conclusion, { text: conclusion }) : "",
  ].filter((line) => line !== "");
}

/**
 * Satu entri per bagian kasus: nama dan cara menampilkannya. Menambah bagian baru dari
 * server cukup menambah satu entri di sini; tampilan riwayat dan compare tidak perlu diubah.
 * Record dengan key dari kontrak membuat tsc gagal selama ada bagian yang belum punya entri.
 * Urutan entri adalah urutan baris di tampilan, sama dengan urutan di server.
 */
const SECTION_LABELS = messages<Record<SectionKey, string>>({
  id: {
    "identity.title": "Judul",
    "identity.question": "Pertanyaan",
    category: "Kategori",
    case_code: "ID kasus",
    split_tag: "Tag dev/test",
    legal_refs: "Rujukan hukum",
    answer_criteria: "Kriteria jawaban",
  },
  en: {
    "identity.title": "Title",
    "identity.question": "Question",
    category: "Category",
    case_code: "Case ID",
    split_tag: "Dev/test tag",
    legal_refs: "Legal references",
    answer_criteria: "Answer criteria",
  },
});

const SECTION_VIEW: Record<SectionKey, SectionView> = {
  "identity.title": { lines: (s) => single(s["identity.title"]) },
  "identity.question": { lines: (s) => single(s["identity.question"]) },
  category: { lines: (s) => single(s.category) },
  case_code: { lines: (s) => single(s.case_code) },
  split_tag: { lines: (s) => single(s.split_tag) },
  legal_refs: { lines: (s, locale) => legalRefLines(s.legal_refs, locale) },
  answer_criteria: { lines: (s, locale) => answerCriteriaLines(s.answer_criteria, locale) },
};

/**
 * Nama bagian yang sudah dicabut dari kontrak (SCRUM-256) tetapi mungkin masih ada di daftar
 * `changed` untuk versi lama. Tidak ditampilkan, supaya tampilan tidak memunculkan jebakan lagi.
 * Server SCRUM-256 menghitung `changed` dari 7 bagian saat dibaca, jadi filter ini hanya berguna
 * selama server yang dipakai belum memuat perubahan itu. Hapus bersama `visibleChanged` setelah
 * server SCRUM-256 ada di dev dan prod.
 */
const RETIRED_SECTIONS: ReadonlySet<string> = new Set(["traps"]);

/** Daftar `changed` dari server tanpa bagian yang sudah dicabut. */
export function visibleChanged(changed: readonly string[]): string[] {
  return changed.filter((name) => !RETIRED_SECTIONS.has(name));
}

/** Nama semua bagian, dalam urutan tampilan. */
export const SECTION_KEYS = Object.keys(SECTION_VIEW) as SectionKey[];

/** Label satu bagian. Nama yang belum dikenal (server lebih baru dari client) tampil apa adanya. */
export function sectionLabel(name: string, locale: Locale = DEFAULT_LOCALE): string {
  const labels = text(SECTION_LABELS, locale);
  return Object.hasOwn(labels, name) ? labels[name as SectionKey] : name;
}

/** Isi satu bagian sebagai baris teks. */
export function sectionLines(
  name: SectionKey,
  sections: VersionSections,
  locale: Locale = DEFAULT_LOCALE,
): string[] {
  return SECTION_VIEW[name].lines(sections, locale);
}

/**
 * Teks kolom "Perubahan" di riwayat. Versi 1 selalu punya daftar kosong karena
 * tidak ada versi sebelumnya; versi lain dengan daftar kosong berarti tidak ada bagian yang beda.
 */
export function describeChanged(
  versionNo: number,
  changed: readonly string[],
  locale: Locale = DEFAULT_LOCALE,
): string {
  const names = visibleChanged(changed);
  if (names.length > 0) return names.map((name) => sectionLabel(name, locale)).join(", ");
  const copy = text(LINE_COPY, locale);
  return versionNo === 1 ? copy.firstVersion : copy.nothingChanged;
}
