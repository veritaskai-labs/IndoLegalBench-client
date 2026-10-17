import type { components } from "@/lib/generated/api";

export type AuditEntityType = components["schemas"]["AuditEntityType"];
export type AuditEntry = components["schemas"]["AuditLogRead"];
export type AuditPage = components["schemas"]["Page_AuditLogRead_"];
export type ExportFormat = components["schemas"]["ExportFormat"];


export type AuditFilter = {
  from: string;
  to: string;
  entity_type?: AuditEntityType;
  actor_id?: string;
  case_id?: string;
  page: number;
  size?: number;
};