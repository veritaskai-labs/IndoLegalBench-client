import type { AuditEntityType } from "@/types/audit";

export const ENTITY_LABEL: Record<AuditEntityType, string> = {
  case: "Kasus",
  case_version: "Versi kasus",
  review: "Review",
  suite: "Suite",
  ai_product: "Produk AI",
  user: "Pengguna",
  call_log: "Log panggilan",
  measurement_session: "Sesi pengukuran",
  rubric_version: "Versi rubrik",
  judge_provider: "Penilai LLM",
};

export function entityLabel(type: string): string {
  return ENTITY_LABEL[type as AuditEntityType] ?? type;
}