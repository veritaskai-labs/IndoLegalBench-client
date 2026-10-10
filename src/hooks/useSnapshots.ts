"use client";

import type { SnapshotPage } from "@/types/snapshot";

export const SNAPSHOT_PAGE_SIZE = 10;

export type SnapshotsState =
  | { status: "loading" }
  | { status: "ready"; page: SnapshotPage }
  | { status: "error"; message: string };

export function useSnapshots(suiteId: string, page: number) {
  void suiteId;
  void page;
  const state = { status: "loading" } as SnapshotsState;
  return { ...state, reload: () => {} };
}
