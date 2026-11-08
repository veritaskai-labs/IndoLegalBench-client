import type {
  CreateRubricVersionRequest,
  RubricAspectInput,
  RubricDescriptorInput,
  RubricLevelInput,
} from "@/types/rubric";
import type { DraftAspect, DraftLevel, RubricDraft } from "./rubricDraft";

/** Kosong atau spasi saja berarti belum diisi, yang server terima sebagai null. */
function blankToNull(value: string): string | null {
  return value.trim() === "" ? null : value;
}

/**
 * Bobot kosong berarti rubrik tanpa bobot (rubrik holistik klien). Teks yang bukan angka juga
 * null, bukan NaN; input form bertipe number tidak menghasilkannya, dan aturan "semua kosong atau
 * semua terisi dan berjumlah 100" tetap diputuskan server (422).
 */
function toWeight(text: string): number | null {
  if (text.trim() === "") return null;
  const weight = Number(text);
  return Number.isFinite(weight) ? weight : null;
}

function toAspect(aspect: DraftAspect): RubricAspectInput {
  return {
    name: aspect.name,
    grader_path: aspect.graderPath,
    weight: toWeight(aspect.weight),
    definition: aspect.definition,
  };
}

/** Deskriptor yang ditulis untuk skor ini, urut aspek. Yang kosong atau spasi saja tidak dikirim. */
function descriptorsOf(aspects: DraftAspect[], score: number): RubricDescriptorInput[] {
  return aspects
    .map((aspect) => ({ aspect_name: aspect.name, descriptor: aspect.descriptors[score] ?? "" }))
    .filter(({ descriptor }) => descriptor.trim() !== "");
}

function toLevel(level: DraftLevel, aspects: DraftAspect[]): RubricLevelInput {
  return {
    score: level.score,
    label: level.label,
    is_passing: level.isPassing,
    descriptors: descriptorsOf(aspects, level.score),
  };
}

/**
 * Isian form menjadi body POST /admin/rubrics. Tidak ada aturan validasi di sini: teks wajib dikirim
 * apa adanya dan server yang menolak (422), supaya aturannya hanya hidup di satu tempat.
 */
export function toCreateRequest(draft: RubricDraft): CreateRubricVersionRequest {
  return {
    effective_date: draft.effectiveDate,
    judge_prompt_quality: draft.judgePromptQuality,
    judge_prompt_format: draft.judgePromptFormat,
    approved_by_name: blankToNull(draft.approvedByName),
    approved_at: blankToNull(draft.approvedAt),
    aspects: draft.aspects.map(toAspect),
    levels: draft.levels.map((level) => toLevel(level, draft.aspects)),
  };
}
