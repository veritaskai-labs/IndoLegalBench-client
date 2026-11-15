"use client";

import { useEffect, useRef, useState } from "react";

import type { AsyncResource } from "@/hooks/useAsyncResource";
import { PROGRESS_POLL_MS } from "@/hooks/useMeasurementProgress";
import { usePolledResource } from "@/hooks/usePolledResource";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { isGradingActive, progressErrorMessage } from "@/lib/grading/gradingRules";
import type { GradingProgress, GradingRunQueued } from "@/types/grading";

export type GradingProgressResource = AsyncResource<GradingProgress | null> & {
  reload: () => void;
  /** Ada run yang antre atau berjalan, termasuk yang baru saja dibalas 202: tombol Nilai dimatikan. */
  active: boolean;
  /** Dipanggil setelah POST /grading-runs membalas 202, supaya run itu langsung dianggap aktif dan diikuti. */
  started: (queued: GradingRunQueued) => void;
};

/**
 * Progres penilaian di latar belakang untuk satu sesi (K-13, SCRUM-285). Dibaca dari server, bukan
 * dari dialog, jadi tetap benar setelah refresh atau setelah pindah halaman lalu kembali. Polling
 * passive tiap kira-kira 5 detik selama run antre atau berjalan, lalu berhenti sendiri.
 *
 * enabled false (selain Admin) tidak memanggil server sama sekali: GET /grading-progress hanya
 * untuk Admin. onSettled dipanggil sekali saat run yang terlihat aktif di halaman ini berakhir
 * (selesai atau gagal), supaya pemanggil memuat ulang hasil; run lama yang sudah selesai saat
 * halaman dibuka tidak memicunya.
 */
export function useGradingProgress(
  sessionId: string,
  {
    enabled,
    gateway = httpGradingGateway,
    onSettled,
  }: Readonly<{
    enabled: boolean;
    gateway?: GradingGateway;
    onSettled?: (progress: GradingProgress) => void;
  }>,
): GradingProgressResource {
  const [pendingRunId, setPendingRunId] = useState<string | null>(null);
  const isPending = (data: GradingProgress | null) => pendingRunId !== null && data?.grading_run_id !== pendingRunId;

  const resource = usePolledResource<GradingProgress | null>({
    requestKey: `${sessionId}:${enabled ? "on" : "off"}`,
    load: (passive) => {
      if (!enabled) return Promise.resolve(null);
      return passive ? gateway.progress(sessionId, { activity: "passive" }) : gateway.progress(sessionId);
    },
    toMessage: progressErrorMessage,
    shouldPoll: (data) => enabled && (isGradingActive(data) || isPending(data)),
    intervalMs: PROGRESS_POLL_MS,
  });

  const data = resource.status === "ready" ? resource.data : null;
  const watchedRunId = useRef<string | null>(null);
  const latest = useRef({ data, onSettled });
  useEffect(() => {
    latest.current = { data, onSettled };
  });

  const runId = data?.grading_run_id ?? null;
  const runStatus = data?.status ?? null;
  useEffect(() => {
    if (runId === null || runStatus === null) return;
    if (runStatus === "queued" || runStatus === "running") {
      watchedRunId.current = runId;
      return;
    }
    if (watchedRunId.current !== runId) return;
    watchedRunId.current = null;
    const settled = latest.current.data;
    if (settled !== null) latest.current.onSettled?.(settled);
  }, [runId, runStatus]);

  return {
    ...resource,
    active: enabled && (isGradingActive(data) || isPending(data)),
    started: (queued) => {
      watchedRunId.current = queued.grading_run_id;
      setPendingRunId(queued.grading_run_id);
      resource.reload();
    },
  };
}
