import { apiFetch } from "@/lib/apiClient";
import type { DashboardSummary } from "@/types/dashboard";

/** Ringkasan dashboard sesuai peran (SCRUM-154). Aman dipanggil tiap 60 detik. */
export function getDashboard(options?: { activity?: "passive" }): Promise<DashboardSummary> {
  if (options?.activity === "passive") {
    return apiFetch<DashboardSummary>("/dashboard", { activity: "passive" });
  }
  return apiFetch<DashboardSummary>("/dashboard");
}