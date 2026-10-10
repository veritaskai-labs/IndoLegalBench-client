"use client";

import type { SnapshotRead } from "@/types/snapshot";

export function useCreateSnapshot(suiteId: string, onCreated: (snapshot: SnapshotRead) => void) {
  void suiteId;
  void onCreated;
  return { create: async () => {}, pending: false, error: null as string | null };
}
