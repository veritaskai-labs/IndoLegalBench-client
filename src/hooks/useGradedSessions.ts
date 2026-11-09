"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { sessionsErrorMessage } from "@/lib/grading/gradingRules";
import type { GradedSessionListItem } from "@/types/grading";

/**
 * Sesi selesai yang sudah dinilai, untuk dipilih Admin, Viewer, dan Kontributor di Laporan (PBI-14
 * AC8, PBI-24 AC10). Server yang menyaring sesi dan peran; daftar kosong berarti belum ada yang dinilai.
 * Gateway masuk sebagai parameter, jadi test dan komponen tidak terikat ke fetch.
 */
export function useGradedSessions(gateway: GradingGateway = httpGradingGateway) {
  return useAsyncResource<GradedSessionListItem[]>("graded-sessions", () => gateway.sessions(), sessionsErrorMessage);
}
