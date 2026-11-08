import { apiFetch } from "@/lib/apiClient";
import type { JudgeProviderOption } from "@/types/provider";

/** GET /judge-providers: penilai aktif untuk dropdown form pengukuran. */
export function listJudgeOptions(): Promise<JudgeProviderOption[]> {
  return apiFetch<JudgeProviderOption[]>("/judge-providers");
}
