import { apiFetch } from "@/lib/apiClient";
import type { SnapshotPage, SnapshotRead } from "@/types/snapshot";

function snapshotsPath(suiteId: string): string {
  return `/suites/${encodeURIComponent(suiteId)}/snapshots`;
}

/** POST /suites/{suite_id}/snapshots. Tanpa body: nama snapshot adalah waktu pembuatannya. */
export function createSnapshot(suiteId: string): Promise<SnapshotRead> {
  return apiFetch<SnapshotRead>(snapshotsPath(suiteId), { method: "POST" });
}

/** GET /suites/{suite_id}/snapshots. Terbaru dulu; page mulai dari 1, size paling banyak 100. */
export function listSnapshots(suiteId: string, page: number, size: number): Promise<SnapshotPage> {
  const query = new URLSearchParams({ page: String(page), size: String(size) });
  return apiFetch<SnapshotPage>(`${snapshotsPath(suiteId)}?${query.toString()}`);
}

/** GET /snapshots/{snapshot_id}. Isi kasus yang dibekukan, bukan kasus yang sekarang. */
export function getSnapshot(snapshotId: string): Promise<SnapshotRead> {
  return apiFetch<SnapshotRead>(`/snapshots/${encodeURIComponent(snapshotId)}`);
}
