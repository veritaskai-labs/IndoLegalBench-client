/**
 * Tipe sementara untuk report builder (SCRUM-321), disalin dari skema `ReportCreate` di
 * server #148 (SCRUM-313). Diganti alias `components["schemas"][...]` begitu `POST /reports`
 * masuk ke `contract/openapi.json`.
 */

/** Jenis nilai laporan (PBI-15 AC14). */
export type ScoreScope = "test" | "dev" | "dev_test";

/** Label produk di laporan (PBI-15 AC9). */
export type ProductLabelMode = "real_name" | "code";

/** Filter jenis pengukuran (PBI-15 AC5), sama dengan `measurement_filter` di server. */
export type MeasurementFilter = "all" | "automatic" | "manual";

/**
 * Bagian satu baris `GET /reports/eligible-sessions` yang dipakai aturan builder. Nama field
 * mengikuti usulan Kak Aileen di #148 (20 Nov); tipe lengkapnya datang dari kontrak.
 */
export interface PickableSession {
  session_id: string;
  product_id: string;
  eligible: boolean;
  session_type: "automatic" | "manual";
  judge_model_version: string | null;
}
