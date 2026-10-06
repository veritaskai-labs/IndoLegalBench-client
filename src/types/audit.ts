/**
 * PLACEHOLDER BE
 * TODO(SCRUM-140): endpoint audit belum ada di OpenAPI server.
 * Nama field mengikuti tabel deskripsi SCRUM-140.
 * Setelah BE merge, `npm run gen:api` lalu sesuaikan tipe ini.
 */

export type AuditEntityType = "case" | "case_version" | "review" | "suite" | "ai_product" | "user";

export type AuditEntry = {
  id: string;
  occurred_at: string;
  actor_user_id: string;
  action: string;
  entity_type: AuditEntityType;
  entity_id: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
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
  page: number;
};