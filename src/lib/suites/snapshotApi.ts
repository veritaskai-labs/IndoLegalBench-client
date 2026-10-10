import type { SnapshotRead } from "@/types/snapshot";

export function createSnapshot(suiteId: string): Promise<SnapshotRead> {
  void suiteId;
  return Promise.resolve({} as SnapshotRead);
}
