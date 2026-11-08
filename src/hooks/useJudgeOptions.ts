"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { listJudgeOptions } from "@/lib/providers/judgeApi";
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

const DEFAULT_API: JudgeOptionsApi = { listJudgeOptions };

/** Daftar penilai aktif; teks layar diputuskan komponennya. */
export function useJudgeOptions(
  api: JudgeOptionsApi = DEFAULT_API,
): JudgeOptions {
  const resource = useAsyncResource(
    "judge-options",
    () => api.listJudgeOptions(),
    () => "",
  );
  const { reload } = resource;

  if (resource.status === "ready")
    return { status: "ready", options: resource.data, reload };
  return { status: resource.status, reload };
}
