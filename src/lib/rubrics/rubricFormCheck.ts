import { formatWibDate } from "@/lib/datetime/formatWib";
import type { GraderPath } from "@/types/rubric";
import { createEmptyDraft, type DraftAspect, type DraftLevel, type RubricDraft } from "./rubricDraft";

/**
 * Pemeriksaan form versi baru sebelum dikirim (SCRUM-375 B1, B5). Hanya aturan "isian wajib tidak
 * kosong" yang dicek di sini, sama dengan TeksWajib di server, supaya Admin tahu bagian mana yang
 * belum lengkap sebelum menekan Simpan. Aturan antar-isian (bobot 100, lulus di atas gagal, nama
 * ganda) tetap hanya di server dan pesannya tetap datang lewat 422.
 */

/** Label jalur penilaian di form dan ringkasan; jalur baru dari server hanya menambah satu baris. */
export const GRADER_PATH_LABEL: Record<GraderPath, string> = {
  deterministic: "Deterministik",
  llm: "LLM judge",
};

export interface RequiredProblem {
  /** Path field seperti yang dipakai form untuk galat 422 (aspects[0].name). */
  path: string;
  sectionId: string;
  message: string;
}

export interface FormSection {
  id: string;
  title: string;
  /** Jumlah isian wajib yang masih kosong di bagian ini. */
  problems: number;
  complete: boolean;
}

export const SECTION_INFO = "informasi";
export const SECTION_PROMPT = "prompt";
export const SECTION_SCALE = "skala";

/** Id bagian satu aspek; nomornya ikut urutan, sama seperti label "Aspek 1". */
export function aspectSectionId(index: number): string {
  return `aspek-${index + 1}`;
}

function blank(text: string): boolean {
  return text.trim() === "";
}

/** Isian wajib yang kosong, urut dari atas form, supaya fokus bisa pindah ke yang pertama. */
export function requiredProblems(draft: RubricDraft): RequiredProblem[] {
  const problems: RequiredProblem[] = [];
  const need = (missing: boolean, path: string, sectionId: string, message: string) => {
    if (missing) problems.push({ path, sectionId, message });
  };

  need(blank(draft.effectiveDate), "effective_date", SECTION_INFO, "Isi tanggal berlaku sejak.");
  need(blank(draft.judgePromptQuality), "judge_prompt_quality", SECTION_PROMPT, "Isi prompt penilai kualitas.");
  need(blank(draft.judgePromptFormat), "judge_prompt_format", SECTION_PROMPT, "Isi prompt penilai format.");
  draft.levels.forEach((level, index) => {
    need(blank(level.label), `levels[${index}].label`, SECTION_SCALE, `Isi label skor ${level.score}.`);
  });
  draft.aspects.forEach((aspect, index) => {
    const number = index + 1;
    const section = aspectSectionId(index);
    need(blank(aspect.name), `aspects[${index}].name`, section, `Isi nama aspek ${number}.`);
    need(blank(aspect.definition), `aspects[${index}].definition`, section, `Isi definisi aspek ${number}.`);
  });
  return problems;
}

/** Bagian form untuk navigasi kanan (B1): centang bila lengkap, jumlah isian kosong bila belum. */
export function formSections(draft: RubricDraft): FormSection[] {
  const problems = requiredProblems(draft);
  const section = (id: string, title: string): FormSection => {
    const count = problems.filter((problem) => problem.sectionId === id).length;
    return { id, title, problems: count, complete: count === 0 };
  };
  return [
    section(SECTION_INFO, "Informasi versi"),
    section(SECTION_PROMPT, "Prompt penilai"),
    section(SECTION_SCALE, "Skala nilai"),
    ...draft.aspects.map((_, index) => section(aspectSectionId(index), `Aspek ${index + 1}`)),
  ];
}

/** "a", "a dan b", "a, b dan c". */
function joinWithDan(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} dan ${items.at(-1)}`;
}

/** Ringkasan galat di atas form (B5): berapa yang kosong dan di bagian mana. */
export function problemSummary(sections: readonly FormSection[]): string {
  const incomplete = sections.filter((section) => section.problems > 0);
  const total = incomplete.reduce((sum, section) => sum + section.problems, 0);
  return `${total} isian wajib belum diisi di ${joinWithDan(incomplete.map((section) => section.title))}. Versi belum disimpan.`;
}

/** Dua skor memakai "dan" (5 dan 4); lebih dari dua cukup koma (3, 2, 1, 0), seperti desain. */
function scoreList(scores: readonly number[]): string {
  return scores.length === 2 ? `${scores[0]} dan ${scores[1]}` : scores.join(", ");
}

function passingScores(levels: readonly DraftLevel[]) {
  return {
    passing: levels.filter((level) => level.isPassing).map((level) => level.score),
    failing: levels.filter((level) => !level.isPassing).map((level) => level.score),
  };
}

/** Ringkasan ambang lulus di bawah tabel skala (B2). */
export function passingSummary(levels: readonly DraftLevel[]): string {
  const { passing, failing } = passingScores(levels);
  const part = (scores: number[]) => (scores.length === 0 ? "belum ada skor" : `skor ${scoreList(scores)}`);
  return `Lulus: ${part(passing)}. Tidak lulus: ${part(failing)}.`;
}

function sameAspectAsFresh(aspect: DraftAspect, fresh: DraftAspect): boolean {
  return (
    blank(aspect.name) &&
    blank(aspect.weight) &&
    blank(aspect.definition) &&
    aspect.graderPath === fresh.graderPath &&
    Object.values(aspect.descriptors).every(blank)
  );
}

/**
 * Form masih sama dengan form baru (B6): Batal dan template langsung jalan tanpa konfirmasi, seperti
 * prototipe. Centang Lulus atau jalur yang diubah juga dihitung, karena template akan menimpanya.
 */
export function isDraftEmpty(draft: RubricDraft): boolean {
  const fresh = createEmptyDraft();
  const textsBlank = [draft.effectiveDate, draft.approvedByName, draft.approvedAt, draft.judgePromptQuality, draft.judgePromptFormat].every(blank);
  const levelsFresh =
    draft.levels.length === fresh.levels.length &&
    draft.levels.every((level, index) => blank(level.label) && level.isPassing === fresh.levels[index].isPassing);
  const aspectsFresh = draft.aspects.length === 1 && sameAspectAsFresh(draft.aspects[0], fresh.aspects[0]);
  return textsBlank && levelsFresh && aspectsFresh;
}

export interface SummaryRow {
  label: string;
  values: string[];
}

const DASH = "-";

function approverLine(name: string, approvedAt: string): string {
  const trimmed = name.trim();
  if (trimmed === "") return DASH;
  return blank(approvedAt) ? trimmed : `${trimmed} · ${formatWibDate(approvedAt)}`;
}

function aspectLine(aspect: DraftAspect, index: number): string {
  const parts = [String(index + 1), aspect.name.trim(), GRADER_PATH_LABEL[aspect.graderPath]];
  if (!blank(aspect.weight)) parts.push(`bobot ${aspect.weight.trim()}`);
  return parts.join(" · ");
}

/** Isi dialog "Simpan Versi N?" (B4): hal yang tidak bisa diubah setelah versi disimpan. */
export function saveSummaryRows(draft: RubricDraft): SummaryRow[] {
  const { passing } = passingScores(draft.levels);
  return [
    { label: "Berlaku sejak", values: [formatWibDate(draft.effectiveDate)] },
    { label: "Penyetuju", values: [approverLine(draft.approvedByName, draft.approvedAt)] },
    { label: "Skor lulus", values: [passing.length === 0 ? DASH : scoreList(passing)] },
    { label: "Aspek", values: draft.aspects.map(aspectLine) },
  ];
}
