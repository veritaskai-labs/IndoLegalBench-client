"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { sessionsErrorMessage } from "@/lib/grading/gradingRules";
import type { GradedRunListItem } from "@/types/grading";

/**
 * Grading run dari sesi selesai, satu baris per run, untuk dipilih Admin, Viewer, dan Kontributor di
 * Laporan (PBI-14 AC8, PBI-22 AC9, PBI-24 AC10). Server yang menyaring sesi dan peran; daftar kosong
 * berarti belum ada yang dinilai.
 * Gateway masuk sebagai parameter, jadi test dan komponen tidak terikat ke fetch.
 */
export function useGradedSessions(gateway: GradingGateway = httpGradingGateway) {
  return useAsyncResource<GradedRunListItem[]>("graded-sessions", () => gateway.sessions(), sessionsErrorMessage);
}
