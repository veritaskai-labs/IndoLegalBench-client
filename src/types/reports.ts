import type { components } from "@/lib/generated/api";

export type ScoreScope = components["schemas"]["ScoreScope"];
export type ScoreSplit = components["schemas"]["ScoreSplit"];
export type MeasurementFilter = components["schemas"]["MeasurementFilter"];
export type MeasurementKind = components["schemas"]["MeasurementKind"];
export type ReportStatus = components["schemas"]["ReportStatus"];
export type ReportLanguage = components["schemas"]["ReportLanguage"];
export type ProductLabelMode = components["schemas"]["ProductLabelMode"];

export type ReportMarkerRead = components["schemas"]["ReportMarkerRead"];
export type ReportDetailResultRead = components["schemas"]["ReportDetailResultRead"];
/** Tanpa session_id dan product_id agar mode kode tidak membuka produk asli (AC9). Kunci baris: result.id (server#149). */
export type ReportDetailSessionRead = components["schemas"]["ReportDetailSessionRead"];
export type ReportCaseBasisRead = components["schemas"]["ReportCaseBasisRead"];

export type ReportSummary = components["schemas"]["ReportSummary"];
export type ReportSummaryPage = components["schemas"]["Page_ReportSummary_"];
export type ReportDetail = components["schemas"]["ReportDetail"];

/** Penelusuran angka laporan (PBI-16, server#149): kasus di balik satu angka, lalu satu kasus sampai jawaban asli. */
export type ReportResultCasesRead = components["schemas"]["ReportResultCasesRead"];
export type ReportCaseScoreRead = components["schemas"]["ReportCaseScoreRead"];
export type ReportCaseDetailRead = components["schemas"]["ReportCaseDetailRead"];
export type ReportAttemptRead = components["schemas"]["ReportAttemptRead"];
