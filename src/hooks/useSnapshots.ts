"use client";

import { listSnapshots } from "@/lib/suites/snapshotApi";
import { mapSnapshotLoadError } from "@/lib/suites/snapshotErrors";
import type { SnapshotPage } from "@/types/snapshot";
import { useAsyncResource } from "./useAsyncResource";

export const SNAPSHOT_PAGE_SIZE = 10;

export type SnapshotsState =
  | { status: "loading" }
  | { status: "ready"; page: SnapshotPage }
  | { status: "error"; message: string };

const listMessage = (error: unknown) => mapSnapshotLoadError(error, "list");

/** Satu halaman daftar snapshot suite, terbaru dulu. */
export function useSnapshots(suiteId: string, page: number) {
  const { reload, ...resource } = useAsyncResource(
    `${suiteId}|${page}`,
    () => listSnapshots(suiteId, page, SNAPSHOT_PAGE_SIZE),
    listMessage,
  );

  const state: SnapshotsState =
    resource.status === "ready" ? { status: "ready", page: resource.data } : resource;
  return { ...state, reload };
}
