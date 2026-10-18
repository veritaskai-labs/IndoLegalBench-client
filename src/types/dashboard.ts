import type { components } from "@/lib/generated/api";

/**
 * Ringkasan dashboard (GET /dashboard, SCRUM-154). Sejak kontraknya mendarat di
 * staging, tipenya diturunkan dari skema — sebelumnya ditulis tangan di sini.
 */
export type CaseCounts = components["schemas"]["CaseCounts"];
export type PendingReview = components["schemas"]["PendingReview"];
export type LatestRunSummary = components["schemas"]["LatestRunSummary"];
export type DashboardSummary = components["schemas"]["DashboardSummary"];