import { ApiError } from "@/lib/apiClient";
import { allowedScoreScopes } from "@/lib/reports/builder/builderRules";
import type { Role } from "@/types";
import type { EligibleSession, ScoreScope, TrendPointRead, TrendRead } from "@/types/reports";

import type { TrendQuery } from "./trendApi";
import { breakLabel, markerLabel, warningLabel } from "./trendLabels";

export interface ProductOption {
  id: string;
  name: string;
}

const FORBIDDEN_SCOPE_MESSAGE = "Peran Anda hanya boleh melihat tren skor test.";
const MISSING_PRODUCT_MESSAGE = "Produk tidak ditemukan.";

/**
 * Filter jenis kasus hanya untuk peran yang boleh lebih dari skor test (PBI-17 AC1, AC12). Daftarnya sama dengan
 * pembuat laporan (allowedScoreScopes), jadi aturan skor dev tetap di satu tempat. Ini hanya tampilan: server
 * tetap menolak dengan 403.
 */
export function canFilterTrendScope(role: Role | null): boolean {
  return allowedScoreScopes(role).length > 1;
}

/** Jenis kasus yang benar-benar dikirim: pilihan yang tidak lagi boleh diganti ke test, skor resmi. */
export function effectiveTrendScope(role: Role | null, scope: ScoreScope): ScoreScope {
  return allowedScoreScopes(role).includes(scope) ? scope : "test";
}

/**
 * Produk untuk pemilih, satu kali per produk dan urut nama. Sumbernya daftar sesi laporan, karena terbuka untuk
 * semua peran, sedangkan daftar produk lain terbatas per peran. Produk tanpa sesi layak tetap muncul; trennya
 * sendiri yang menjawab kosong.
 */
export function productOptions(sessions: readonly EligibleSession[]): ProductOption[] {
  const byId = new Map<string, string>();
  for (const session of sessions) {
    if (!byId.has(session.product_id)) byId.set(session.product_id, session.product_name);
  }
  return [...byId].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, "id"));
}

/** Pesan untuk kegagalan yang artinya jelas bagi pembaca; null untuk sisanya, yang cukup dicoba lagi. */
function knownFailure(error: unknown): string | null {
  if (!(error instanceof ApiError)) return null;
  if (error.status === 403 && error.code === "TREND_SCOPE_FORBIDDEN") return FORBIDDEN_SCOPE_MESSAGE;
  if (error.status === 404) return MISSING_PRODUCT_MESSAGE;
  return null;
}

export function trendErrorMessage(error: unknown): string {
  return knownFailure(error) ?? "Tren gagal dimuat. Coba lagi.";
}

export function trendPdfErrorMessage(error: unknown): string {
  return knownFailure(error) ?? "PDF tren gagal dimuat. Coba lagi.";
}

/**
 * Nama berkas unduhan memuat produk dan semua pilihan, supaya dua unduhan tidak saling menimpa. Id produk
 * datang dari pilihan pengguna, jadi karakter selain huruf, angka, garis bawah, dan tanda hubung diganti.
 */
export function trendPdfFileName({ productId, scope, metric, range }: TrendQuery): string {
  return `tren-${productId.replaceAll(/[^A-Za-z0-9_-]/g, "-")}-${scope}-${metric}-${range}.pdf`;
}

/** Ada titik yang punya skor. Bila tidak ada, garis tidak digambar sama sekali (PBI-17 AC11). */
export function hasDrawablePoint(points: readonly TrendPointRead[]): boolean {
  return points.some((point) => point.value !== null);
}

/** Alasan garis diputus lebih dulu, lalu penanda titik, dalam bahasa pembaca (PBI-17 AC5). */
export function pointNotes(point: TrendPointRead): string[] {
  return [...point.breaks.map(breakLabel), ...point.markers.map(markerLabel)];
}

/** Peringatan tren dalam bahasa pembaca, satu kali per teks walau server mengulang kodenya. */
export function trendWarnings(read: TrendRead): string[] {
  return [...new Set(read.warnings.map(warningLabel))];
}
