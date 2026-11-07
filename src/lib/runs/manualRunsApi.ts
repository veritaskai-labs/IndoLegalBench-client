import { apiFetch, ApiError } from "@/lib/apiClient";
import { isManualStatus } from "@/lib/runs/sessionRules";
import { listSessions } from "@/lib/runs/runsApi";
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
 * Mencoba GET /manual-measurements terlebih dahulu; bila belum tersedia,
 * mengambil dari daftar sesi umum yang difilter status manual.
 */
export async function listManualSessions(): Promise<SessionListItem[]> {
  try {
    const items = await apiFetch<SessionListItem[]>(BASE, {
      silentForbidden: true,
    });
    return items.filter((item) => isManualStatus(item.status));
  } catch {
    const all = await listSessions();
    return all.filter((item) => isManualStatus(item.status));
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  PRODUCT_NOT_MANUAL: "Produk yang dipilih bukan produk AI manual.",
  PRODUCT_INACTIVE: "Produk AI yang dipilih sedang tidak aktif.",
  AI_PRODUCT_NOT_FOUND: "Produk AI tidak ditemukan.",
  NO_ELIGIBLE_CASES: "Tidak ada kasus yang disetujui dan bertag sesuai pilihan di suite ini.",
  SUITE_ARCHIVED: "Salah satu suite yang dipilih telah diarsipkan.",
  MANUAL_SESSION_NOT_FOUND: "Sesi pengukuran manual tidak ditemukan.",
  MANUAL_SESSION_INCOMPLETE: "Masih ada jawaban yang belum terisi. Lengkapi semua jawaban terlebih dahulu.",
  MANUAL_SESSION_FINALIZED: "Sesi ini sudah ditandai selesai.",
  FORBIDDEN: "Anda tidak memiliki akses untuk tindakan ini.",
};

export function manualErrorMessage(error: unknown, fallback = "Terjadi kesalahan. Coba lagi."): string {
  if (error instanceof ApiError) {
    if (error.serverMessage) return error.serverMessage;
    const known = ERROR_MESSAGES[error.code];
    if (known) return known;
  }
  return fallback;
}
