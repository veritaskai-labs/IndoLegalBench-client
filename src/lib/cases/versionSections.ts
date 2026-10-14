import type { VersionSections } from "@/types/caseVersion";

type SectionKey = keyof VersionSections;

type SectionView = {
  label: string;
  /** Isi bagian ini sebagai baris teks untuk tampilan berdampingan. Kosong berarti bagian itu tidak terisi. */
  lines: (sections: VersionSections) => string[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Kontrak menulis isi bagian ini sebagai unknown, jadi tiap nilai dipersempit dulu sebelum ditampilkan. */
function text(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function textList(value: unknown): string[] {
  return Array.isArray(value) ? value.map(text).filter((item) => item !== "") : [];
}

function single(value: unknown): string[] {
  const shown = text(value);
  return shown === "" ? [] : [shown];
}

/** "UU No. 13 Tahun 2003, Pasal 151 ayat (3) huruf a". Bagian yang kosong dilewati. */
function legalRefLine(ref: unknown): string | null {
  if (!isRecord(ref)) return null;
  const regulation = [
    text(ref.regulation_type),
    text(ref.regulation_number) && `No. ${text(ref.regulation_number)}`,
    text(ref.year) && `Tahun ${text(ref.year)}`,
  ]
    .filter(Boolean)
    .join(" ");
  const provision = [
    text(ref.pasal) && `Pasal ${text(ref.pasal)}`,
    text(ref.ayat) && `ayat (${text(ref.ayat)})`,
    text(ref.huruf) && `huruf ${text(ref.huruf)}`,
  ]
    .filter(Boolean)
    .join(" ");
  const line = [regulation, provision].filter(Boolean).join(", ");
  return line === "" ? null : line;
}

function legalRefLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(legalRefLine).filter((line): line is string => line !== null);
}

function answerCriteriaLines(value: unknown): string[] {
  if (!isRecord(value)) return [];
  const mustContain = textList(value.must_contain);
  const mustNotContain = textList(value.must_not_contain);
  const conclusion = text(value.expected_conclusion);
  return [
    mustContain.length > 0 ? `Wajib ada: ${mustContain.join("; ")}` : "",
    mustNotContain.length > 0 ? `Tidak boleh ada: ${mustNotContain.join("; ")}` : "",
    conclusion !== "" ? `Kesimpulan: ${conclusion}` : "",
  ].filter((line) => line !== "");
}

function trapLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const lines: string[] = [];
  for (const trap of value) {
    if (!isRecord(trap) || text(trap.description) === "") continue;
    const behavior = text(trap.expected_model_behavior);
    const suffix = behavior === "" ? "" : ` (perilaku yang diharapkan: ${behavior})`;
    lines.push(`${lines.length + 1}. ${text(trap.description)}${suffix}`);
  }
  return lines;
}

/**
 * Satu entri per bagian kasus: nama dan cara menampilkannya. Menambah bagian baru dari
 * server cukup menambah satu entri di sini; tampilan riwayat dan compare tidak perlu diubah.
 * Record dengan key dari kontrak membuat tsc gagal selama ada bagian yang belum punya entri.
 * Urutan entri adalah urutan baris di tampilan, sama dengan urutan di server.
 */
const SECTION_VIEW: Record<SectionKey, SectionView> = {
  "identity.title": { label: "Judul", lines: (s) => single(s["identity.title"]) },
  "identity.question": { label: "Pertanyaan", lines: (s) => single(s["identity.question"]) },
  category: { label: "Kategori", lines: (s) => single(s.category) },
  case_code: { label: "ID kasus", lines: (s) => single(s.case_code) },
  split_tag: { label: "Tag dev/test", lines: (s) => single(s.split_tag) },
  legal_refs: { label: "Rujukan hukum", lines: (s) => legalRefLines(s.legal_refs) },
  answer_criteria: { label: "Kriteria jawaban", lines: (s) => answerCriteriaLines(s.answer_criteria) },
  traps: { label: "Jebakan", lines: (s) => trapLines(s.traps) },
};

/** Nama semua bagian, dalam urutan tampilan. */
export const SECTION_KEYS = Object.keys(SECTION_VIEW) as SectionKey[];

/** Label satu bagian. Nama yang belum dikenal (server lebih baru dari client) tampil apa adanya. */
export function sectionLabel(name: string): string {
  return Object.hasOwn(SECTION_VIEW, name) ? SECTION_VIEW[name as SectionKey].label : name;
}

/** Isi satu bagian sebagai baris teks. */
export function sectionLines(name: SectionKey, sections: VersionSections): string[] {
  return SECTION_VIEW[name].lines(sections);
}

/**
 * Teks kolom "Perubahan" di riwayat. Versi 1 selalu punya daftar kosong karena
 * tidak ada versi sebelumnya; versi lain dengan daftar kosong berarti tidak ada bagian yang beda.
 */
export function describeChanged(versionNo: number, changed: readonly string[]): string {
  if (changed.length > 0) return changed.map(sectionLabel).join(", ");
  return versionNo === 1 ? "Versi pertama" : "Tidak ada bagian yang berubah";
}
