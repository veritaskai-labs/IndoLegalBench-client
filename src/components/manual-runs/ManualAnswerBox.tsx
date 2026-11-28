"use client";

import { useEffect, useId, useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useManualAnswerDraft } from "@/hooks/useManualAnswerDraft";
import { formatWib } from "@/lib/datetime/formatWib";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { validateDraft } from "@/lib/runs/manualAnswerRules";
import { answerErrorMessage, type ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { ManualAnswerResponse, ManualAttemptSlot } from "@/types/measurement";
import { AnswerFields } from "./AnswerFields";
import { AnswerHistoryDialog } from "./AnswerHistoryDialog";
import { EvidencePanel } from "./EvidencePanel";

const COPY = messages({
  id: {
    attempt: "Percobaan {n}",
    empty: "Belum terisi",
    refused: "Platform menolak",
    filled: "Terisi",
    obtained: "Diperoleh: {when}",
    saving: "Menyimpan...",
    save: "Simpan jawaban",
    history: "Riwayat",
    overwriteTitle: "Timpa jawaban yang sudah ada?",
    overwriteConfirm: "Timpa jawaban",
    overwriteBusy: "Menimpa...",
    overwriteBody: "{label} sudah diisi. Jawaban sebelumnya tetap tersimpan di Riwayat dan bisa dilihat semua orang yang dapat membuka sesi ini.",
  },
  en: {
    attempt: "Attempt {n}",
    empty: "Not filled in",
    refused: "Platform refused",
    filled: "Filled in",
    obtained: "Obtained: {when}",
    saving: "Saving...",
    save: "Save answer",
    history: "History",
    overwriteTitle: "Overwrite the existing answer?",
    overwriteConfirm: "Overwrite answer",
    overwriteBusy: "Overwriting...",
    overwriteBody: "{label} is already filled in. The previous answer stays in History and can be seen by everyone who can open this session.",
  },
});

function statusLabel(slot: ManualAttemptSlot, copy: (typeof COPY)["id"]): string {
  if (!slot.filled) return copy.empty;
  return slot.platform_refused ? copy.refused : copy.filled;
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
  currentUserId,
  onSaved,
  onDirtyChange,
}: Readonly<{
  sessionId: string;
  snapshotItemId: string;
  slot: ManualAttemptSlot;
  gateway: ManualAnswerGateway;
  canEdit: boolean;
  currentUserId: string | null;
  onSaved: (response: ManualAnswerResponse) => void;
  onDirtyChange: (attemptId: string, dirty: boolean) => void;
}>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const answer = useManualAnswerDraft({
    sessionId,
    snapshotItemId,
    attemptNo: slot.repetition_no,
    slot,
    gateway,
    onSaved,
  });

  const [historyOpen, setHistoryOpen] = useState(false);
  const attemptId = slot.attempt_id;
  useEffect(() => onDirtyChange(attemptId, answer.dirty), [attemptId, answer.dirty, onDirtyChange]);
  // Kotak yang hilang tidak lagi punya perubahan yang menunggu disimpan.
  useEffect(() => () => onDirtyChange(attemptId, false), [attemptId, onDirtyChange]);

  const label = fill(copy.attempt, { n: slot.repetition_no });
  const fieldErrors = Object.keys(answer.errors).length > 0 ? validateDraft(answer.draft, locale) : answer.errors;
  const headingId = useId();

  return (
    <fieldset aria-labelledby={headingId} className="min-w-0 space-y-3 rounded-md border border-slate-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 id={headingId} className="text-sm font-semibold text-slate-900">
          {label}
        </h4>
        <span
          className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
            slot.filled ? "bg-emerald-100 text-emerald-800" : "bg-slate-200 text-slate-700"
          }`}
        >
          {statusLabel(slot, copy)}
        </span>
      </div>
      {slot.filled && slot.answered_at_platform && (
        <p className="text-[11px] text-slate-500">{fill(copy.obtained, { when: formatWib(slot.answered_at_platform) })}</p>
      )}

      <AnswerFields
        attemptNo={slot.repetition_no}
        draft={answer.draft}
        errors={fieldErrors}
        disabled={!canEdit}
        onChange={answer.setField}
      />

      {answer.saveError && (
        <p role="alert" className="text-sm text-red-700">
          {answer.saveError}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {canEdit && (
          <button
            type="button"
            onClick={() => void answer.save()}
            disabled={answer.saving}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {answer.saving ? copy.saving : copy.save}
          </button>
        )}
        {slot.filled && (
          <button
            type="button"
            onClick={() => setHistoryOpen(true)}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {copy.history}
          </button>
        )}
      </div>

      <EvidencePanel
        gateway={gateway}
        sessionId={sessionId}
        snapshotItemId={snapshotItemId}
        attemptNo={slot.repetition_no}
        evidenceCount={slot.evidence_count}
        slotFilled={slot.filled}
        canEdit={canEdit}
      />

      {historyOpen && (
        <AnswerHistoryDialog
          gateway={gateway}
          sessionId={sessionId}
          snapshotItemId={snapshotItemId}
          attemptNo={slot.repetition_no}
          currentUserId={currentUserId}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {answer.confirming && (
        <ConfirmDialog
          title={copy.overwriteTitle}
          confirmLabel={copy.overwriteConfirm}
          busyLabel={copy.overwriteBusy}
          onConfirm={answer.confirmOverwrite}
          errorMessage={(error) => answerErrorMessage(error, undefined, locale)}
          onDone={() => undefined}
          onClose={() => answer.cancelOverwrite()}
        >
          <p className="mt-2 text-sm text-slate-700">
            {fill(copy.overwriteBody, { label })}
          </p>
        </ConfirmDialog>
      )}
    </fieldset>
  );
}
