import { ApiError } from "@/lib/apiClient";
import type { Role } from "@/lib/auth";
import { type SortState, sortRows } from "@/lib/ui/tableModel";
import type { ReportCaseScoreRead, ReportDetail, ScoreSplit } from "@/types/reports";

import { REPORT_CONTACT_EMAIL } from "./reportLabels";

/** Kolom daftar kasus yang bisa diurutkan; hanya ini yang diterima dari alamat (SCRUM-378). */
const CASE_SORT_KEYS: ReadonlySet<string> = new Set(["case_code", "det_score", "llm_score"]);

/** Nama parameter alamat untuk urutan daftar kasus, mis. ?urut=llm_score-desc (SCRUM-378). */
export const CASE_SORT_PARAM = "urut";

/**
 * Urutan daftar kasus dari alamat. Nilai yang tidak dikenal dibaca sebagai urutan server, supaya alamat yang
 * diketik tangan tidak pernah merusak halaman.
 */
export function parseCaseSort(value: string | null | undefined): SortState | null {
  const [key, direction, ...rest] = (value ?? "").split("-");
  if (rest.length > 0 || !CASE_SORT_KEYS.has(key)) return null;
  return direction === "asc" || direction === "desc" ? { key, direction } : null;
}

function withSort(path: string, sort: SortState | null | undefined): string {
  return sort ? `${path}?${CASE_SORT_PARAM}=${sort.key}-${sort.direction}` : path;
}

/**
 * Halaman daftar kasus di balik satu angka (D6 langkah 1–3). Urutan yang dipilih ikut di alamat, supaya kembali
 * dari detail kasus membuka daftar dengan urutan yang sama (SCRUM-378).
 */
export function resultCasesHref(reportId: string, resultId: string, sort?: SortState | null): string {
  return withSort(`/reports/comparisons/${encodeURIComponent(reportId)}/results/${encodeURIComponent(resultId)}`, sort);
}

/** Satu langkah breadcrumb; bentuknya sama dengan BreadcrumbItem di komponen UI. */
export type TrailStep = { label: string; href: string };

/**
 * Tiga langkah pertama breadcrumb halaman penelusuran: Laporan, Laporan perbandingan, lalu laporannya sendiri.
 * Judul laporan dipakai bila sudah dimuat (SCRUM-346 A2, temuan N4); selama dimuat atau bila gagal, "Detail
 * laporan", yang tetap berbeda dari "Laporan" untuk pembaca layar (review #104).
 */
export function reportTrail(reportId: string, title: string | null): TrailStep[] {
  return [
    { label: "Laporan", href: "/reports" },
    { label: "Laporan perbandingan", href: "/reports/comparisons" },
    { label: title ?? "Detail laporan", href: `/reports/comparisons/${encodeURIComponent(reportId)}` },
  ];
}

/** Satu produk di laporan beserta angka yang bisa ditelusuri untuk jenis nilai yang sama. */
export type ProductNumber = { label: string; resultId: string };

/**
 * Produk lain di laporan yang punya angka dengan jenis nilai yang sama dengan angka yang sedang dibuka (SCRUM-346
 * A2), dalam urutan sesi dari server. Hanya dari laporan yang sudah dikirim server untuk peran ini (D9), jadi tidak
 * ada angka yang tidak boleh dilihat.
 */
export function sameSplitProducts(report: ReportDetail, split: ScoreSplit): ProductNumber[] {
  return report.sessions.flatMap((session) => {
    const result = session.results.find((item) => item.score_split === split);
    return result ? [{ label: session.product_label, resultId: result.id }] : [];
  });
}

/** Halaman satu kasus sampai jawaban asli (D6 langkah 4–7), dengan urutan daftar asalnya (SCRUM-378). */
export function resultCaseHref(reportId: string, resultId: string, caseId: string, sort?: SortState | null): string {
  return withSort(`${resultCasesHref(reportId, resultId)}/cases/${encodeURIComponent(caseId)}`, sort);
}

/** Posisi satu kasus di antara kasus yang bisa dibuka, dan tetangganya (SCRUM-378). */
export type CaseNeighbours = {
  position: number;
  total: number;
  previous: ReportCaseScoreRead | null;
  next: ReportCaseScoreRead | null;
};

/**
 * "Kasus sebelumnya" dan "Kasus berikutnya" dari detail kasus (SCRUM-378, alternatif A2 SCRUM-346). Urutannya sama
 * dengan daftar kasus: urutan server, atau kolom yang dipilih pengguna lewat sortRows yang sama dengan DataTable.
 * Kasus tertutup dilewati, karena isinya tidak bisa dibuka peran ini (AC3, content_visible). null bila kasus ini
 * tidak ada di antara kasus yang bisa dibuka.
 */
export function caseNeighbours(
  cases: readonly ReportCaseScoreRead[],
  caseId: string,
  sort: SortState | null,
): CaseNeighbours | null {
  const openable = sortRows(cases, sort, {}).filter((item) => item.content_visible);
  const index = openable.findIndex((item) => item.case_id === caseId);
  if (index < 0) return null;
  return {
    position: index + 1,
    total: openable.length,
    previous: openable[index - 1] ?? null,
    next: openable[index + 1] ?? null,
  };
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

export function canCompareProducts(role: Role | null): boolean {
  return role !== null && ADMIN_AND_CONTRIBUTOR.has(role);
}

/** Percobaan gagal teknis tidak punya skor dan ditandai "tidak dinilai", bukan skor 0 (AC2). */
export const NOT_GRADED = "Tidak dinilai";
