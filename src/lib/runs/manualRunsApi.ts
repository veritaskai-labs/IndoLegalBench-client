import { apiFetch, ApiError } from "@/lib/apiClient";
import { DEFAULT_LOCALE, messages, text, type Locale } from "@/lib/i18n/locale";
import { isManualStatus } from "@/lib/runs/sessionRules";
import type {
  ManualFinalizeResponse,
  ManualSessionDetail,
  ManualStartRequest,
  ManualStartResponse,
  SessionListItem,
} from "@/types/measurement";

const BASE = "/manual-measurements";

function manualPath(sessionId: string): string {
  return `${BASE}/${encodeURIComponent(sessionId)}`;
}

/**
 * Buat sesi pengukuran manual: snapshot kasus saat itu juga, status Belum terisi (AC1, AC2, SCRUM-230).
 */
export function createManualSession(
  payload: ManualStartRequest,
): Promise<ManualStartResponse> {
  return apiFetch<ManualStartResponse>(BASE, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * Baca detail sesi manual beserta kartu kasus dan percobaan (AC3, AC4, AC8, AC11-AC13).
 * unfilled=true hanya mengembalikan kartu kasus yang masih memiliki percobaan kosong.
 */
export function getManualSession(
  sessionId: string,
  unfilled = false,
): Promise<ManualSessionDetail> {
  const query = unfilled ? "?unfilled=true" : "";
  return apiFetch<ManualSessionDetail>(`${manualPath(sessionId)}${query}`);
}

/**
 * Tandai sesi manual selesai: final, tidak dapat dibuka kembali (AC8, D9).
 */
export function finalizeManualSession(
  sessionId: string,
): Promise<ManualFinalizeResponse> {
  return apiFetch<ManualFinalizeResponse>(`${manualPath(sessionId)}/finalize`, {
    method: "POST",
  });
}

/**
 * Daftar sesi pengukuran manual untuk Admin dan Kontributor (AC8, AC11).
 * Memanggil GET /manual-measurements langsung tanpa fallback agar tidak memicu 403
 * bagi peran Kontributor yang tidak berhak mengakses daftar sesi otomatis (/measurements).
 */
export async function listManualSessions(): Promise<SessionListItem[]> {
  const items = await apiFetch<SessionListItem[]>(BASE);
  return items.filter((item) => isManualStatus(item.status));
}

const ERROR_MESSAGES = messages({
  id: {
    PRODUCT_NOT_MANUAL: "Produk yang dipilih bukan produk AI manual.",
    PRODUCT_INACTIVE: "Produk AI yang dipilih sedang tidak aktif.",
    AI_PRODUCT_NOT_FOUND: "Produk AI tidak ditemukan.",
    NO_ELIGIBLE_CASES: "Tidak ada kasus yang disetujui dan bertag sesuai pilihan di suite ini.",
    SUITE_ARCHIVED: "Salah satu suite yang dipilih telah diarsipkan.",
    MANUAL_SESSION_NOT_FOUND: "Sesi pengukuran manual tidak ditemukan.",
    MANUAL_SESSION_INCOMPLETE: "Masih ada jawaban yang belum terisi. Lengkapi semua jawaban terlebih dahulu.",
    MANUAL_SESSION_FINALIZED: "Sesi ini sudah ditandai selesai.",
    FORBIDDEN: "Anda tidak memiliki akses untuk tindakan ini.",
    fallback: "Terjadi kesalahan. Coba lagi.",
  },
  en: {
    PRODUCT_NOT_MANUAL: "The selected product is not a manual AI product.",
    PRODUCT_INACTIVE: "The selected AI product is inactive.",
    AI_PRODUCT_NOT_FOUND: "AI product not found.",
    NO_ELIGIBLE_CASES: "This suite has no approved cases with a tag that matches the selection.",
    SUITE_ARCHIVED: "One of the selected suites has been archived.",
    MANUAL_SESSION_NOT_FOUND: "Manual measurement session not found.",
    MANUAL_SESSION_INCOMPLETE: "Some answers are still empty. Fill in every answer first.",
    MANUAL_SESSION_FINALIZED: "This session is already marked finished.",
    FORBIDDEN: "You do not have access for this action.",
    fallback: "Something went wrong. Try again.",
  },
});

export function manualErrorMessage(error: unknown, fallback?: string, locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(ERROR_MESSAGES, locale);
  if (error instanceof ApiError) {
    if (error.serverMessage) return error.serverMessage;
    if (Object.hasOwn(copy, error.code) && error.code !== "fallback") return copy[error.code as keyof typeof copy];
  }
  return fallback ?? copy.fallback;
}
