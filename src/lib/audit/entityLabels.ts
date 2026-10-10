import type { AuditEntityType } from "@/types/audit";

export const ENTITY_LABEL: Record<AuditEntityType, string> = {
  case: "Kasus",
  case_version: "Versi kasus",
  review: "Review",
  suite: "Suite",
  ai_product: "Produk AI",
  user: "Pengguna",
};

export function entityLabel(type: string): string {
  return ENTITY_LABEL[type as AuditEntityType] ?? type;
}