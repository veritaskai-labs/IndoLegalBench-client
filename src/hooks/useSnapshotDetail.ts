"use client";

import type { SnapshotRead } from "@/types/snapshot";

type SnapshotDetailState =
  | { status: "loading" }
  | { status: "ready"; snapshot: SnapshotRead }
  | { status: "error"; message: string };

export function useSnapshotDetail(snapshotId: string) {
  void snapshotId;
  const state = { status: "loading" } as SnapshotDetailState;
  return { ...state, reload: () => {} };
}
