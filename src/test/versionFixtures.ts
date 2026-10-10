import type {
  VersionCompare,
  VersionSections,
  VersionSide,
  VersionSummary,
} from "@/types/caseVersion";

/** Data contoh bersama untuk test riwayat dan perbandingan versi, supaya bentuknya tidak disalin per file. */

export function makeSections(overrides: Partial<VersionSections> = {}): VersionSections {
  return {
    "identity.title": "Pemberitahuan PHK",
    "identity.question": "Apakah wajib tertulis?",
    category: "Ketenagakerjaan",
    case_code: "ILB-PT-0142",
    split_tag: "dev",
    legal_refs: [],
    answer_criteria: {},
    traps: [],
    ...overrides,
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
