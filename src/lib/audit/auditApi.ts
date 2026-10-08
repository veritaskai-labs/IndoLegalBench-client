import { apiFetch } from "@/lib/apiClient";
import type { AuditFilter, AuditPage, ExportFormat } from "@/types/audit";
import type { components } from "@/lib/generated/api";
export type AuditActor = components["schemas"]["UserResponse"];

const BASE = "/audit-logs";

export function listAuditActors(): Promise<AuditActor[]> {
  return apiFetch<AuditActor[]>("/admin/users");
}

/**
 * Tanggal dari input date dikirim sebagai date-time. BE menganggap waktu
 * tanpa zona sebagai WIB, dan `to` inklusif — jadi batas atas harus akhir
 * hari, bukan tengah malam, supaya catatan di hari itu tidak hilang.
 */
function toQuery(filter: AuditFilter): URLSearchParams {
  const q = new URLSearchParams();
  q.set("from", `${filter.from}T00:00:00`);
  q.set("to", `${filter.to}T23:59:59`);
  q.set("page", String(filter.page));
  if (filter.size) q.set("size", String(filter.size));
  if (filter.entity_type) q.set("entity_type", filter.entity_type);
  if (filter.actor_id) q.set("actor_id", filter.actor_id);
  if (filter.case_id) q.set("case_id", filter.case_id);
  return q;
}

export function listAuditLogs(filter: AuditFilter): Promise<AuditPage> {
  return apiFetch<AuditPage>(`${BASE}?${toQuery(filter)}`);
}

/** Server yang membuat filenya. Tautan dibuka langsung oleh browser. */
export function auditExportUrl(filter: AuditFilter, format: ExportFormat): string {
  const q = toQuery(filter);
  q.set("format", format);
  return `${BASE}/export?${q}`;
}