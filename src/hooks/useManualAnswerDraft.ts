"use client";

import { useCallback, useRef, useState } from "react";
import {
  buildSaveRequest,
  draftFromSlot,
  isDirty,
  validateDraft,
  type AnswerDraft,
  type DraftErrors,
} from "@/lib/runs/manualAnswerRules";
import {
  answerErrorMessage,
  isConfirmationRequired,
  type ManualAnswerGateway,
} from "@/lib/runs/manualAnswersApi";
import type { ManualAnswerResponse, ManualAttemptSlot } from "@/types/measurement";

const SAVE_FALLBACK = "Gagal menyimpan jawaban. Coba lagi.";

type Options = {
  sessionId: string;
  snapshotItemId: string;
  attemptNo: number;
  slot: ManualAttemptSlot;
  gateway: ManualAnswerGateway;
  onSaved: (response: ManualAnswerResponse) => void;
  /** Hanya untuk tes: patokan "sekarang" bagi isian awal waktu. */
  now?: Date;
};

/**
 * Alur satu kotak jawaban: isian, perubahan belum tersimpan, simpan, dan konfirmasi menimpa (AC5).
 * Aturan isian ada di manualAnswerRules dan pemanggilan server di gateway yang disuntikkan,
 * jadi hook ini hanya mengatur urutan dan state.
 */
export function useManualAnswerDraft({
  sessionId,
  snapshotItemId,
  attemptNo,
  slot,
  gateway,
  onSaved,
  now,
}: Readonly<Options>) {
  const [baseline, setBaseline] = useState<AnswerDraft>(() => draftFromSlot(slot, now));
  const [draft, setDraft] = useState<AnswerDraft>(baseline);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  // Ref, bukan state: klik kedua bisa masuk sebelum render ulang menonaktifkan tombol.
  const inFlight = useRef(false);

  const errors: DraftErrors = showErrors ? validateDraft(draft) : {};

  const setField = useCallback(<K extends keyof AnswerDraft>(key: K, value: AnswerDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  }, []);

  const attempt = useCallback(
    async (confirm: boolean) => {
      const request = buildSaveRequest(draft, snapshotItemId, attemptNo, confirm);
      if (request === null) {
        setShowErrors(true);
        return;
      }
      // Slot yang sudah terisi selalu minta konfirmasi dulu sebelum apa pun dikirim (AC5).
      if (!confirm && slot.filled) {
        setConfirming(true);
        return;
      }
      if (inFlight.current) return;
      inFlight.current = true;
      setSaving(true);
      setSaveError(null);
      let saved: ManualAnswerResponse | null = null;
      try {
        saved = await gateway.saveAnswer(sessionId, request);
        setBaseline(draft);
        setConfirming(false);
        setShowErrors(false);
      } catch (failure) {
        // Orang lain mengisi slot ini setelah halaman dimuat: server minta konfirmasi.
        const needsConfirm = isConfirmationRequired(failure);
        setConfirming(needsConfirm);
        if (!needsConfirm) setSaveError(answerErrorMessage(failure, SAVE_FALLBACK));
      } finally {
        inFlight.current = false;
        setSaving(false);
      }
      // Di luar try: galat di onSaved bukan kegagalan simpan.
      if (saved !== null) onSaved(saved);
    },
    [draft, snapshotItemId, attemptNo, slot.filled, gateway, sessionId, onSaved],
  );

  const save = useCallback(() => attempt(false), [attempt]);
  const confirmOverwrite = useCallback(() => attempt(true), [attempt]);
  const cancelOverwrite = useCallback(() => setConfirming(false), []);

  return {
    draft,
    dirty: isDirty(draft, baseline),
    errors,
    saving,
    saveError,
    confirming,
    setField,
    save,
    confirmOverwrite,
    cancelOverwrite,
  };
}
