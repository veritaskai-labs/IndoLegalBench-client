/** Sesuai AuditEntityType di openapi.json. */
export type AuditEntityType =
  | "case"
  | "case_version"
  | "review"
  | "suite"
  | "ai_product"
  | "user";

export type AuditEntry = {
  id: number;
  occurred_at: string;
  actor_user_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  action: string;
  entity_type: AuditEntityType;
  entity_id: string;
  case_id: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  request_id: string | null;
};

export type AuditPage = {
  items: AuditEntry[];
  total: number;
  page: number;
  size: number;
};

export type AuditFilter = {
  from: string;
  to: string;
  entity_type?: AuditEntityType;
  actor_id?: string;
  case_id?: string;
  page: number;
  size?: number;
};

export type ExportFormat = "csv" | "pdf";