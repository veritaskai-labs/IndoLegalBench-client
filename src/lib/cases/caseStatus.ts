import type { CaseStatus } from "@/types/case";

/** Record, bukan string bebas: status baru di contract membuat tsc gagal sampai labelnya ditambah. */
export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  draft: "Draft",
  in_review: "Dalam tinjauan",
  needs_revision: "Perlu revisi",
  approved: "Disetujui",
};
