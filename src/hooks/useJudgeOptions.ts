"use client";

import type { JudgeProviderOption } from "@/types/provider";

/** Pemanggilan API yang dipakai hook; test memberi tiruan lewat parameter. */
export interface JudgeOptionsApi {
  listJudgeOptions(): Promise<JudgeProviderOption[]>;
}

export type JudgeOptions = (
  | { status: "loading" }
  | { status: "ready"; options: JudgeProviderOption[] }
  | { status: "error" }
) & { reload: () => void };

/** Daftar penilai aktif; teks layar diputuskan komponennya. */
export function useJudgeOptions(api?: JudgeOptionsApi): JudgeOptions {
  void api;
  return { status: "loading", reload: () => {} };
}
