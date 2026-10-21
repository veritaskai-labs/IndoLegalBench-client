import type { VersionSections } from "@/types/caseVersion";
import type { ReviewCopy } from "@/types/review";

/**
 * Salinan kasus untuk reviewer ditulis ulang dengan nama bagian yang sama dengan riwayat versi,
 * supaya rujukan hukum, kriteria jawaban, dan pengurang poin diformat oleh satu tempat yang sama
 * (versionSections) dan tidak ditulis ulang di sini.
 */
export function reviewCopyToSections(copy: ReviewCopy): VersionSections {
  return {
    "identity.title": copy.identity.title,
    "identity.question": copy.identity.question,
    category: copy.identity.category,
    case_code: copy.case_code,
    split_tag: copy.split_tag,
    legal_refs: copy.legal_refs,
    answer_criteria: copy.answer_criteria,
    traps: copy.traps,
  };
}
