import type { SnapshotItem } from "@/types/snapshot";

export type SnapshotCaseView = {
  caseId: string;
  caseCode: string;
  title: string;
  versionNo: number | null;
  sections: { key: string; label: string; lines: string[] }[];
};

export function toSnapshotCaseView(item: SnapshotItem): SnapshotCaseView {
  void item;
  return { caseId: "", caseCode: "", title: "", versionNo: null, sections: [] };
}
