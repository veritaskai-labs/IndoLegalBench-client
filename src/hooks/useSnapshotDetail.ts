"use client";

import { getSnapshot } from "@/lib/suites/snapshotApi";
import { mapSnapshotLoadError } from "@/lib/suites/snapshotErrors";
import type { SnapshotRead } from "@/types/snapshot";
import { useAsyncResource } from "./useAsyncResource";

const detailMessage = (error: unknown) => mapSnapshotLoadError(error, "detail");

type SnapshotDetailState =
  | { status: "loading" }
  | { status: "ready"; snapshot: SnapshotRead }
  | { status: "error"; message: string };

/** Isi satu snapshot. */
export function useSnapshotDetail(snapshotId: string) {
  const { reload, ...resource } = useAsyncResource(
    snapshotId,
    () => getSnapshot(snapshotId),
    detailMessage,
  );

  const state: SnapshotDetailState =
    resource.status === "ready" ? { status: "ready", snapshot: resource.data } : resource;
  return { ...state, reload };
}
