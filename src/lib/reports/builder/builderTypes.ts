/**
 * Tipe sementara untuk report builder (SCRUM-321), disalin dari skema `ReportCreate` di
 * server #148 (SCRUM-313). Diganti alias `components["schemas"][...]` begitu `POST /reports`
 * masuk ke `contract/openapi.json`.
 */

/** Jenis nilai laporan (PBI-15 AC14). */
export type ScoreScope = "test" | "dev" | "dev_test";

/** Label produk di laporan (PBI-15 AC9). */
export type ProductLabelMode = "real_name" | "code";
