"use client";

import { useCallback, useRef, useState } from "react";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { saveBlob } from "@/lib/browserDownload";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";
import { validateEvidence, type EvidenceInput } from "@/lib/runs/manualEvidenceRules";
import { answerErrorMessage, type ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { EvidenceRead } from "@/types/measurement";

const COPY = messages({
  id: "Terjadi kesalahan pada bukti jawaban. Coba lagi.",
  en: "Something went wrong with the answer evidence. Try again.",
});
const GENERIC_FILE_NAME = "bukti-jawaban";

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
  const fallback = useText(COPY);
  const locale = useLocale();
  const toMessage = useCallback(
    (error: unknown) => answerErrorMessage(error, fallback, locale),
    [fallback, locale],
  );
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
    async (job: () => Promise<void>, reloadAfter: boolean): Promise<boolean> => {
      if (inFlight.current) return false;
      inFlight.current = true;
      setBusy(true);
      setError(null);
      try {
        await job();
        if (reloadAfter) reload();
        return true;
      } catch (failure) {
        setError(toMessage(failure));
        return false;
      } finally {
        inFlight.current = false;
        setBusy(false);
      }
    },
    [reload, toMessage],
  );

  const count = list.status === "ready" ? list.data.length : null;

  const add = useCallback(
    async (input: EvidenceInput): Promise<boolean> => {
      if (count === null) return false;
      const problem = validateEvidence(input, count, locale);
      if (problem !== null) {
        setError(problem);
        return false;
      }
      return run(async () => {
        await gateway.addEvidence(sessionId, snapshotItemId, attemptNo, input);
      }, true);
    },
    [count, run, gateway, sessionId, snapshotItemId, attemptNo, locale],
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
