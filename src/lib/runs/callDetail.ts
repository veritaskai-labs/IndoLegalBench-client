import { ApiError } from "@/lib/apiClient";
import type { CallAttemptLog } from "@/types/measurement";

const DETIK = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export function tryLabel(
  call: Pick<CallAttemptLog, "try_no" | "is_manual_retry">
): string {
  const label = `Upaya ke-${call.try_no}`;

  return call.is_manual_retry
    ? `${label} (coba ulang)`
    : label;
}

export function durationText(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "–";

  if (ms < 1000) return `${Math.round(ms)} ms`;

  return `${DETIK.format(ms / 1000)} detik`;
}

export function callResultText(
  call: Pick<CallAttemptLog, "result" | "failure_kind">
): string {
  if (call.result === "ok") return "Berhasil";

  return call.failure_kind ?? call.result;
}

export function callErrorText(
  call: Pick<CallAttemptLog, "error_summary">
): string | null {
  const message = call.error_summary?.trim();

  return message === undefined || message === ""
    ? null
    : message;
}

export function rawResponseText(
  raw: CallAttemptLog["raw_response"]
): string | null {
  if (raw === null || raw === undefined) return null;

  try {
    return JSON.stringify(raw, null, 2) ?? null;
  } catch {
    return null;
  }
}


export function maskedNotice(): string {
  return "Isi mentah disembunyikan. Hanya jenis kegagalan dan waktunya yang bisa ditampilkan.";
}


export function mapCallDetailError(error: unknown): string {
  if (!(error instanceof ApiError)) {
    return "Gagal memuat detail teknis. Coba lagi.";
  }

  if (error.code === "ATTEMPT_NOT_FOUND") {
    return "Percobaan ini tidak ada di sesi tersebut.";
  }

  if (error.code === "MEASUREMENT_NOT_FOUND") {
    return "Sesi tidak ditemukan.";
  }

  return "Gagal memuat detail teknis. Coba lagi.";
}