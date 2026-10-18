import { apiFetch } from "@/lib/apiClient";
import type { DashboardSummary } from "@/types/dashboard";

/** Ringkasan dashboard sesuai peran (SCRUM-154). Aman dipanggil tiap 60 detik. */
export function getDashboard(): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>("/dashboard");
}