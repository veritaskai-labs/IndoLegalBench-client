"use client";

import { useCallback } from "react";

import { regradeErrorMessage } from "@/lib/rubrics/rubricErrors";
import { httpRubricsGateway, type RubricsGateway } from "@/lib/rubrics/rubricsApi";
import type { GradingRun } from "@/types/rubric";
import { useAsyncAction } from "./useAsyncAction";

/**
 * Mulai nilai ulang satu sesi dengan versi rubrik yang dipilih (PBI-14 AC7). Penjaga klik ganda,
 * pending, dan pesan error datang dari useAsyncAction; di sini hanya panggilan ke gateway yang
 * disuntikkan. Hasil lama tetap tersimpan: server menambah run baru, tidak menimpa.
 */
export function useRegrade(
  sessionId: string,
  versionId: string,
  onDone: (run: GradingRun) => void,
  gateway: RubricsGateway = httpRubricsGateway,
) {
  const regrade = useCallback(
    () => gateway.regrade(sessionId, { rubric_version_id: versionId }),
    [gateway, sessionId, versionId],
  );
  return useAsyncAction(regrade, onDone, regradeErrorMessage);
}
