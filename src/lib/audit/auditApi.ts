import { apiFetch } from "@/lib/apiClient";
import type { AuditFilter, AuditPage } from "@/types/audit";

const BASE = "/audit-logs";

/**
 * TODO(SCRUM-140): nama query param masih mengikuti deskripsi subtask,
 * belum dikonfirmasi lewat OpenAPI.
 */

function toQuery(filter: AuditFilter): string {
  const params = new URLSearchParams({
    from: filter.from,
    to: filter.to,
    page: String(filter.page),
  });
  if (filter.entity_type) params.set("entity_type", filter.entity_type);
  if (filter.actor_id) params.set("actor_id", filter.actor_id);
  return params.toString();
}

export function listAuditLogs(filter: AuditFilter): Promise<AuditPage> {
  return apiFetch<AuditPage>(`${BASE}?${toQuery(filter)}`);
}

export function auditExportUrl(filter: AuditFilter, format: "csv" | "pdf"): string {
  return `${BASE}/export?${toQuery(filter)}&format=${format}`;
}