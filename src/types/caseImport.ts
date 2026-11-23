import type { components } from "@/lib/generated/api";

/** Ringkasan satu impor CSV (POST /case-imports, GET /case-imports/{batch_id}). */
export type ImportSummary = components["schemas"]["ImportSummaryRead"];
/** Hasil satu baris CSV; row_no mengikuti spreadsheet (header = baris 1). */
export type ImportRow = components["schemas"]["ImportRowRead"];
export type ImportRowStatus = components["schemas"]["ImportRowStatus"];
