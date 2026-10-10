import type { SnapshotPage, SnapshotRead, SnapshotSummary } from "@/types/snapshot";

/** Data contoh bersama untuk test snapshot. */

export function makeSnapshot(overrides: Partial<SnapshotRead> = {}): SnapshotRead {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    suite_id: "11111111-1111-1111-1111-111111111111",
    created_at: "2026-10-03T07:05:00Z",
    author: { id: "u1", name: "Aileen" },
    items: [],
    ...overrides,
  };
}

export function makeSnapshotSummary(overrides: Partial<SnapshotSummary> = {}): SnapshotSummary {
  return {
    id: "33333333-3333-3333-3333-333333333333",
    created_at: "2026-10-03T07:05:00Z",
    author: { id: "u1", name: "Aileen" },
    case_count: 2,
    ...overrides,
  };
}

export function makeSnapshotPage(
  items: SnapshotSummary[],
  overrides: Partial<SnapshotPage> = {},
): SnapshotPage {
  return { items, total: items.length, page: 1, size: 10, ...overrides };
}
