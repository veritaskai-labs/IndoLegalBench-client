"use client";

import { useEffect } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useManualAnswerDraft } from "@/hooks/useManualAnswerDraft";
import { formatWib } from "@/lib/datetime/formatWib";
import { answerErrorMessage, type ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { ManualAnswerResponse, ManualAttemptSlot } from "@/types/measurement";
import { AnswerFields } from "./AnswerFields";

function statusLabel(slot: ManualAttemptSlot): string {
  if (!slot.filled) return "Belum diisi";
  return slot.platform_refused ? "Platform menolak" : "Terisi";
}

/**
 * Satu kotak "Percobaan n" pada kartu kasus (AC4). Merangkai hook alur simpan, isian, dan dialog
 * konfirmasi menimpa; tidak ada aturan bisnis di sini.
 */
export function ManualAnswerBox({
  sessionId,
  snapshotItemId,
  slot,
  gateway,
  canEdit,
  onSaved,
  onDirtyChange,
}: Readonly<{
  sessionId: string;
  snapshotItemId: string;
  slot: ManualAttemptSlot;
  gateway: ManualAnswerGateway;
  canEdit: boolean;
  onSaved: (response: ManualAnswerResponse) => void;
  onDirtyChange: (attemptId: string, dirty: boolean) => void;
}>) {
  const answer = useManualAnswerDraft({
    sessionId,
    snapshotItemId,
    attemptNo: slot.repetition_no,
    slot,
    gateway,
    onSaved,
  });

  const attemptId = slot.attempt_id;
  useEffect(() => onDirtyChange(attemptId, answer.dirty), [attemptId, answer.dirty, onDirtyChange]);
  // Kotak yang hilang tidak lagi punya perubahan yang menunggu disimpan.
  useEffect(() => () => onDirtyChange(attemptId, false), [attemptId, onDirtyChange]);

  const label = `Percobaan ${slot.repetition_no}`;

  return (
    <div role="group" aria-label={label} className="space-y-3 rounded-md border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-900">{label}</h4>
        <span
          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
            slot.filled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
          }`}
        >
          {statusLabel(slot)}
        </span>
      </div>
      {slot.filled && slot.answered_at_platform && (
        <p className="text-[11px] text-slate-500">Diperoleh: {formatWib(slot.answered_at_platform)}</p>
      )}

      <AnswerFields
        attemptNo={slot.repetition_no}
        draft={answer.draft}
        errors={answer.errors}
        disabled={!canEdit}
        onChange={answer.setField}
      />

      {answer.saveError && (
        <p role="alert" className="text-sm text-red-700">
          {answer.saveError}
        </p>
      )}

      {canEdit && (
        <button
          type="button"
          onClick={() => void answer.save()}
          disabled={answer.saving}
          className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {answer.saving ? "Menyimpan..." : "Simpan jawaban"}
        </button>
      )}

      {answer.confirming && (
        <ConfirmDialog
          title="Timpa jawaban yang sudah ada?"
          confirmLabel="Timpa jawaban"
          busyLabel="Menimpa..."
          onConfirm={answer.confirmOverwrite}
          errorMessage={answerErrorMessage}
          onDone={() => undefined}
          onClose={() => answer.cancelOverwrite()}
        >
          <p className="mt-2 text-sm text-slate-700">
            {label} sudah diisi. Jawaban sebelumnya tetap tersimpan di Riwayat dan bisa dilihat semua orang yang
            dapat membuka sesi ini.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
}
