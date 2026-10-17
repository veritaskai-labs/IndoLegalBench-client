import type {
  VersionCompare,
  VersionSections,
  VersionSide,
  VersionSummary,
} from "@/types/caseVersion";

/** Data contoh bersama untuk test riwayat dan perbandingan versi, supaya bentuknya tidak disalin per file. */

/**
 * Rujukan hukum di sini boleh berbentuk apa saja: snapshot Sprint 1 dan data yang rusak tidak
 * mengikuti tipe kontrak, dan tampilan harus tetap bisa menanganinya.
 */
type SectionOverrides = Omit<Partial<VersionSections>, "legal_refs"> & { legal_refs?: unknown[] };

export function makeSections(overrides: SectionOverrides = {}): VersionSections {
  return {
    "identity.title": "Pemberitahuan PHK",
    "identity.question": "Apakah wajib tertulis?",
    category: "Ketenagakerjaan",
    case_code: "ILB-PT-0142",
    split_tag: "dev",
    legal_refs: [],
    answer_criteria: {},
    traps: [],
    ...(overrides as Partial<VersionSections>),
  };
}

export function makeSummary(versionNo = 1, overrides: Partial<VersionSummary> = {}): VersionSummary {
  return {
    version_no: versionNo,
    status: "approved",
    author: { id: "u1", name: "Aileen" },
    created_at: "2026-10-03T07:05:00Z",
    changed: [],
    ...overrides,
  };
}

export function makeSide(versionNo = 1, overrides: Partial<VersionSide> = {}): VersionSide {
  return {
    version_no: versionNo,
    status: "approved",
    author: { id: "u1", name: "Aileen" },
    created_at: "2026-10-03T07:05:00Z",
    sections: makeSections(),
    ...overrides,
  };
}

export function makeCompare(overrides: Partial<VersionCompare> = {}): VersionCompare {
  return { a: makeSide(1), b: makeSide(2), changed: [], ...overrides };
}
