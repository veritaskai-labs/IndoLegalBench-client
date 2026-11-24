import { ApiError } from "@/lib/apiClient";
import type { Role } from "@/lib/auth";

import { REPORT_CONTACT_EMAIL } from "./reportLabels";

/** Halaman daftar kasus di balik satu angka (D6 langkah 1–3). */
export function resultCasesHref(reportId: string, resultId: string): string {
  return `/reports/comparisons/${encodeURIComponent(reportId)}/results/${encodeURIComponent(resultId)}`;
}

/** Halaman satu kasus sampai jawaban asli (D6 langkah 4–7). */
export function resultCaseHref(reportId: string, resultId: string, caseId: string): string {
  return `${resultCasesHref(reportId, resultId)}/cases/${encodeURIComponent(caseId)}`;
}

/**
 * Teks untuk kasus yang tertutup (AC3). Tidak menyebut peran: hak membuka isi per peran dan jenis kasus berbeda
 * (server case_visibility._DRILLDOWN_SPLITS: Admin semua, Kontributor test, Developer AI dev), jadi teksnya
 * mengikuti pesan server CASE_CONTENT_FORBIDDEN (review #104).
 */
export const CONTENT_REQUEST_TEXT = `Isi kasus yang tertutup tidak dapat dibuka dengan peran Anda. Untuk mendapatkan isi kasus, kirim email ke ${REPORT_CONTACT_EMAIL}.`;

export const HIDDEN_DRILLDOWN = "Data di balik angka ini tidak ditemukan atau Anda tidak punya akses untuk membukanya.";
const LOAD_FAILED = "Gagal memuat data penelusuran. Coba lagi.";

/** Kode server untuk isi kasus yang tidak boleh dibuka peran ini (server#149, AC3). */
const CASE_CONTENT_FORBIDDEN = "CASE_CONTENT_FORBIDDEN";

/**
 * 404 dan 422 (id salah ketik) dibaca sama dengan 403 lain supaya halaman tidak membocorkan laporan orang lain
 * (D9). 403 isi kasus memakai pesan server, yang sudah menyebut email untuk meminta isi kasus (AC3).
 */
export function drilldownErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return LOAD_FAILED;
  if (error.status === 403 && error.code === CASE_CONTENT_FORBIDDEN) return error.serverMessage ?? CONTENT_REQUEST_TEXT;
  if ([403, 404, 422].includes(error.status)) return HIDDEN_DRILLDOWN;
  return LOAD_FAILED;
}

/**
 * Coba lagi hanya untuk gangguan sementara. Pesan dan daftar ini ada di satu modul, jadi mengubah teks pesan
 * tidak diam-diam memunculkan lagi tombol Coba lagi.
 */
export function canRetryDrilldown(message: string): boolean {
  return message === LOAD_FAILED;
}

/** Bukti jawaban manual (AC4, D9 Sprint 4) dan perbandingan produk (SCRUM-372) hanya untuk Admin dan Kontributor; server tetap menegakkannya. */
const ADMIN_AND_CONTRIBUTOR: ReadonlySet<Role> = new Set<Role>(["admin", "contributor"]);

export function canOpenEvidence(role: Role | null): boolean {
  return role !== null && ADMIN_AND_CONTRIBUTOR.has(role);
}

export function canCompareProducts(_role: Role | null): boolean {
  return false;
}

/** Percobaan gagal teknis tidak punya skor dan ditandai "tidak dinilai", bukan skor 0 (AC2). */
export const NOT_GRADED = "Tidak dinilai";
