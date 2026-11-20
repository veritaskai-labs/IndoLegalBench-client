import { formatScore } from "@/lib/grading/scoreFormat";
import type { MeasurementKind, ProductLabelMode, ReportDetail, ReportLanguage } from "@/types/reports";

import { REPORT_LABELS } from "./reportLabels";

const DASH = "–";
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Peringkat dari server; produk tanpa peringkat (salah satu skor kosong, D1) tampil sebagai tanda pisah. */
export function rankText(rank: number | null): string {
  return rank === null ? DASH : String(rank);
}

/**
 * Tingkat kegagalan teknis (PBI-15 AC2): persen dari total upaya, terpisah dari skor. Tidak berlaku untuk
 * produk manual, apa pun nilai yang dikirim server. Nilai kosong atau rusak jadi tanda pisah tanpa "%".
 */
export function failureRateText(kind: MeasurementKind, rate: string | null, language: ReportLanguage): string {
  if (kind === "manual") return REPORT_LABELS[language].notApplicable;
  const shown = formatScore(rate, language);
  return shown === DASH ? DASH : `${shown}%`;
}

/** Sama dengan pdf.py _versi_model: mode kode (AC9) menyamarkan versi, berbeda dari versi yang tidak tercatat. */
export function modelVersionText(version: string | null, labelMode: ProductLabelMode, language: ReportLanguage): string {
  if (labelMode === "code") return REPORT_LABELS[language].hidden;
  if (!version) return DASH;
  return version;
}

/**
 * Tanggal WIB dengan nama bulan lengkap dalam bahasa laporan, misalnya "1 Desember 2026", sama dengan kepala PDF.
 * WIB tetap UTC+7, jadi cukup geser 7 jam dan baca bagian UTC. Teks yang bukan tanggal dikembalikan apa adanya.
 */
export function formatReportDate(iso: string, language: ReportLanguage): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;
  const wib = new Date(time + WIB_OFFSET_MS);
  return `${wib.getUTCDate()} ${REPORT_LABELS[language].months[wib.getUTCMonth()]} ${wib.getUTCFullYear()}`;
}

/**
 * Baris keterangan di bawah judul, urutannya sama dengan PDF. Versi rubrik dan model penilai yang kosong
 * dilewati; jumlah kasus dasar selalu tampil (AC1), termasuk 0.
 */
export function reportInfoLine(report: ReportDetail, language: ReportLanguage): string {
  const labels = REPORT_LABELS[language];
  const parts = [`${labels.created} ${formatReportDate(report.created_at, language)}`];
  if (report.rubric_version_no) parts.push(`${labels.rubric} v${report.rubric_version_no}`);
  if (report.judge_model_name) parts.push(`${labels.judgeModel}: ${report.judge_model_name}`);
  parts.push(`${labels.caseBasis}: ${report.case_basis_count}`);
  return parts.join(" · ");
}
