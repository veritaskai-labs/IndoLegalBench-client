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
/** Tanpa session_id dan product_id agar mode kode tidak membuka produk asli (AC9); kunci barisnya product_label. */
export type ReportDetailSessionRead = components["schemas"]["ReportDetailSessionRead"];
export type ReportCaseBasisRead = components["schemas"]["ReportCaseBasisRead"];

export type ReportSummary = components["schemas"]["ReportSummary"];
export type ReportSummaryPage = components["schemas"]["Page_ReportSummary_"];
export type ReportDetail = components["schemas"]["ReportDetail"];
