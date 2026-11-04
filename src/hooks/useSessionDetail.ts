"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { ApiError } from "@/lib/apiClient";
import { getSession } from "@/lib/runs/runsApi";
import type { SessionDetail } from "@/types/measurement";

/** 404 dibedakan: ID salah atau sesi tidak ada, jadi Coba lagi tidak akan menolong. */
function toMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === "MEASUREMENT_NOT_FOUND") return "Sesi tidak ditemukan.";
  return "Gagal memuat sesi pengukuran. Coba lagi.";
}

/** Detail satu sesi (PBI-11 AC7, AC8). 403 sudah dialihkan ke /forbidden oleh apiFetch. */
export function useSessionDetail(sessionId: string) {
  return useAsyncResource<SessionDetail>(`measurement-session|${sessionId}`, () => getSession(sessionId), toMessage);
}
