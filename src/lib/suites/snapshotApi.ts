import { apiFetch } from "@/lib/apiClient";
import type { SnapshotRead } from "@/types/snapshot";

function snapshotsPath(suiteId: string): string {
  return `/suites/${encodeURIComponent(suiteId)}/snapshots`;
}

/** POST /suites/{suite_id}/snapshots. Tanpa body: nama snapshot adalah waktu pembuatannya. */
export function createSnapshot(suiteId: string): Promise<SnapshotRead> {
  return apiFetch<SnapshotRead>(snapshotsPath(suiteId), { method: "POST" });
}
