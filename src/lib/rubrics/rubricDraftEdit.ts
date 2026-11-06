import { newAspectId, type DraftAspect, type DraftLevel, type RubricDraft } from "./rubricDraft";

/**
 * Perubahan draf form versi baru sebagai fungsi murni (PBI-14 AC7), supaya aturannya tidak
 * tinggal di komponen. Tiap fungsi mengembalikan draf baru dan tidak menyentuh yang diberikan,
 * karena form menyimpannya di state React. Indeks atau skor yang tidak ada tidak mengubah apa pun.
 */
export type TextField = "effectiveDate" | "approvedByName" | "approvedAt" | "judgePromptQuality" | "judgePromptFormat";

const isAspect = (draft: RubricDraft, index: number) => Number.isInteger(index) && index >= 0 && index < draft.aspects.length;

export function setField(draft: RubricDraft, key: TextField, value: string): RubricDraft {
  return { ...draft, [key]: value };
}

export function updateAspect(draft: RubricDraft, index: number, patch: Partial<Omit<DraftAspect, "id" | "descriptors">>): RubricDraft {
  if (!isAspect(draft, index)) return draft;
  return { ...draft, aspects: draft.aspects.map((aspect, i) => (i === index ? { ...aspect, ...patch } : aspect)) };
}

/** Teks dikosongkan tetap disimpan sebagai string kosong; toCreateRequest yang tidak mengirimnya. */
export function setDescriptor(draft: RubricDraft, aspectIndex: number, score: number, text: string): RubricDraft {
  if (!isAspect(draft, aspectIndex)) return draft;
  return {
    ...draft,
    aspects: draft.aspects.map((aspect, i) =>
      i === aspectIndex ? { ...aspect, descriptors: { ...aspect.descriptors, [score]: text } } : aspect,
    ),
  };
}

export function addAspect(draft: RubricDraft): RubricDraft {
  const blank: DraftAspect = { id: newAspectId(), name: "", graderPath: "llm", weight: "", definition: "", descriptors: {} };
  return { ...draft, aspects: [...draft.aspects, blank] };
}

/** Versi butuh minimal satu aspek, jadi yang terakhir tidak bisa dihapus. */
export function removeAspect(draft: RubricDraft, index: number): RubricDraft {
  if (!isAspect(draft, index) || draft.aspects.length <= 1) return draft;
  return { ...draft, aspects: draft.aspects.filter((_, i) => i !== index) };
}

export function updateLevel(draft: RubricDraft, score: number, patch: Partial<Omit<DraftLevel, "score">>): RubricDraft {
  return { ...draft, levels: draft.levels.map((level) => (level.score === score ? { ...level, ...patch } : level)) };
}
