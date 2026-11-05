"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { mapCallDetailError } from "@/lib/runs/callDetail";
import { getAttemptCalls } from "@/lib/runs/runsApi";
import type { AttemptCalls } from "@/types/measurement";

/**
 * Load details only after selecting an attempt.
 * A null ID never sends an API request.
 */
export function useAttemptCalls(
  sessionId: string,
  attemptId: string | null
) {
  return useAsyncResource<AttemptCalls | null>(
    `${sessionId}|${attemptId ?? "belum-dibuka"}`,
    () =>
      attemptId === null
        ? Promise.resolve(null)
        : getAttemptCalls(sessionId, attemptId),
    mapCallDetailError
  );
}