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

export type ReportCreate = components["schemas"]["ReportCreate"];
export type ReportCreateResponse = components["schemas"]["ReportCreateResponse"];
/** Pilihan sesi yang diperiksa tanpa disimpan (POST /reports/validate, SCRUM-366). */
export type ReportValidateRequest = components["schemas"]["ReportValidateRequest"];
export type ReportValidation = components["schemas"]["ReportValidationRead"];
export type ReportViolation = components["schemas"]["ReportViolationRead"];
export type ReportWarning = components["schemas"]["ReportWarningRead"];
/** Satu sesi dari GET /reports/eligible-sessions: layak atau tidak, dengan alasan siap tampil (SCRUM-321). */
export type EligibleSession = components["schemas"]["EligibleSessionRead"];
export type EligibleSessionReason = components["schemas"]["EligibleSessionReasonRead"];
/** Penelusuran angka laporan (PBI-16, server#149): kasus di balik satu angka, lalu satu kasus sampai jawaban asli. */
export type ReportResultCasesRead = components["schemas"]["ReportResultCasesRead"];
export type ReportCaseScoreRead = components["schemas"]["ReportCaseScoreRead"];
export type ReportCaseDetailRead = components["schemas"]["ReportCaseDetailRead"];
export type ReportAttemptRead = components["schemas"]["ReportAttemptRead"];
/** PBI-17 SCRUM-332: versi terbit baru dari POST /reports/{id}/publish. version_no diisi server. */
export type PublicationRead = components["schemas"]["PublicationRead"];
/** Satu baris GET /published-reports; product_labels sudah dibekukan server menurut aturan PBI-15 (AC10). */
export type PublishedReportListItem = components["schemas"]["PublishedReportListItem"];
export type PublishedReportPage = components["schemas"]["Page_PublishedReportListItem_"];

/** Tren skor satu produk antar bulan (PBI-17, server#150 dan server#153). */
export type TrendRead = components["schemas"]["TrendRead"];
export type TrendPointRead = components["schemas"]["TrendPointRead"];
export type TrendMetric = components["schemas"]["TrendMetric"];
export type TrendRange = components["schemas"]["TrendRange"];
