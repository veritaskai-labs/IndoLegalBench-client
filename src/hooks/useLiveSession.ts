"use client";

import type { SessionDetail } from "@/types/measurement";

export const SESSION_POLL_MS = 5000;

export type LiveSession = { session: SessionDetail; stale: boolean; reload: () => void };

// Kerangka untuk commit red: belum polling.
export function useLiveSession(initial: SessionDetail): LiveSession {
  return { session: initial, stale: false, reload: () => {} };
}
