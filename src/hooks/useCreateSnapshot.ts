"use client";

import { useCallback } from "react";
import { createSnapshot } from "@/lib/suites/snapshotApi";
import { mapCreateSnapshotError } from "@/lib/suites/snapshotErrors";
import type { SnapshotRead } from "@/types/snapshot";
import { useAsyncAction } from "./useAsyncAction";

/** Membekukan suite sebagai snapshot. Hasilnya diserahkan ke onCreated. */
export function useCreateSnapshot(suiteId: string, onCreated: (snapshot: SnapshotRead) => void) {
  const action = useCallback(() => createSnapshot(suiteId), [suiteId]);
  const { run, pending, error } = useAsyncAction(action, onCreated, mapCreateSnapshotError);
  return { create: run, pending, error };
}
