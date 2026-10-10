import { SECTION_KEYS, sectionLabel, sectionLines } from "@/lib/cases/versionSections";
import type { VersionSections } from "@/types/caseVersion";
import type { SnapshotItem } from "@/types/snapshot";

export type SnapshotCaseView = {
  caseId: string;
  caseCode: string;
  title: string;
  versionNo: number | null;
  sections: { key: string; label: string; lines: string[] }[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Susun satu kasus beku untuk ditampilkan. Isinya (body) bertipe bebas di kontrak, jadi
 * bentuknya dicek dulu; bagian yang tidak ada tampil kosong dan tidak membuat halaman gagal.
 * Format tiap bagian sama dengan tampilan perbandingan versi (sectionLines).
 */
export function toSnapshotCaseView(item: SnapshotItem): SnapshotCaseView {
  // sectionLines memeriksa tiap nilai sendiri, jadi bentuk yang tidak lengkap aman dilewatkan.
  const sections = (isRecord(item.body.sections) ? item.body.sections : {}) as VersionSections;
  const versionNo = typeof item.body.version_no === "number" ? item.body.version_no : null;

  return {
    caseId: item.case_id,
    caseCode: sectionLines("case_code", sections)[0] ?? "Tanpa ID",
    title: sectionLines("identity.title", sections)[0] ?? "Tanpa judul",
    versionNo,
    sections: SECTION_KEYS.map((key) => ({
      key,
      label: sectionLabel(key),
      lines: sectionLines(key, sections),
    })),
  };
}
