import type { AuditEntry, AuditPage } from "@/types/audit";

export function makeAuditEntry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 1,
    occurred_at: "2026-10-06T03:30:00Z",
    actor_user_id: "u1",
    actor_name: "Herdayani",
    actor_role: "author",
    action: "case.updated",
    entity_type: "case",
    entity_id: "case-1",
    case_id: "case-1",
    before: { title: "Judul lama" },
    after: { title: "Judul baru" },
    reason: null,
    request_id: null,
    ...overrides,
  };
}

export function makeAuditPage(items: AuditEntry[], total = items.length): AuditPage {
  return { items, total, page: 1, size: 20 };
}
