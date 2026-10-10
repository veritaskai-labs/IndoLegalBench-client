"use client";

import type { VersionCompare } from "@/types/caseVersion";

type CompareState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; result: VersionCompare }
  | { status: "error"; message: string };

export function useVersionCompare(caseId: string) {
  void caseId;
  const state = { status: "idle" } as CompareState;
  return { ...state, compare: async (a: number, b: number) => void [a, b] };
}
