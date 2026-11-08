"use client";

import { useCallback, useRef, useState } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { saveBlob } from "@/lib/browserDownload";
import { validateEvidence, type EvidenceInput } from "@/lib/runs/manualEvidenceRules";
import { answerErrorMessage, type ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { EvidenceRead } from "@/types/measurement";

const EVIDENCE_FALLBACK = "Terjadi kesalahan pada bukti jawaban. Coba lagi.";
const GENERIC_FILE_NAME = "bukti-jawaban";

const toMessage = (error: unknown) => answerErrorMessage(error, EVIDENCE_FALLBACK);

/**
 * Bukti satu jawaban (AC7): daftar, tambah (berkas atau tautan), hapus, dan unduh. Aturan batas dan
 * tipe ada di manualEvidenceRules, pemanggilan server di gateway; hook ini mengatur urutannya.
 */
export function useManualEvidence(
  gateway: ManualAnswerGateway,
  sessionId: string,
  snapshotItemId: string,
  attemptNo: number,
) {
  const list = useAsyncResource<EvidenceRead[]>(
    `evidence|${sessionId}|${snapshotItemId}|${attemptNo}`,
    () => gateway.listEvidence(sessionId, snapshotItemId, attemptNo),
    toMessage,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref, bukan state: klik kedua bisa masuk sebelum render ulang menonaktifkan tombol.
  const inFlight = useRef(false);
  const { reload } = list;

  const run = useCallback(
    async (job: () => Promise<void>, reloadAfter: boolean) => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      setError(null);
      try {
        await job();
        if (reloadAfter) reload();
      } catch (failure) {
        setError(toMessage(failure));
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [reload],
  );

  const count = list.status === "ready" ? list.data.length : null;

  const add = useCallback(
    async (input: EvidenceInput) => {
      if (count === null) return;
      const problem = validateEvidence(input, count);
      if (problem !== null) {
        setError(problem);
        return;
      }
      await run(async () => {
        await gateway.addEvidence(sessionId, snapshotItemId, attemptNo, input);
      }, true);
    },
    [count, run, gateway, sessionId, snapshotItemId, attemptNo],
  );

  const remove = useCallback(
    (evidenceId: string) => run(() => gateway.deleteEvidence(sessionId, evidenceId), true),
    [run, gateway, sessionId],
  );

  const download = useCallback(
    (item: EvidenceRead) =>
      run(async () => {
        const blob = await gateway.downloadEvidence(sessionId, item.id);
        saveBlob(blob, item.file_name ?? GENERIC_FILE_NAME);
      }, false),
    [run, gateway, sessionId],
  );

  return { list, busy, error, add, remove, download };
}
