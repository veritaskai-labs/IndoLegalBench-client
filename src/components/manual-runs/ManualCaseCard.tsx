"use client";

import type { ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { ManualAnswerResponse, ManualCaseProgress } from "@/types/measurement";
import { ManualAnswerBox } from "./ManualAnswerBox";
import { QuestionCopyButton } from "./QuestionCopyButton";

/**
 * Satu kartu per kasus pada sesi manual (PBI-22 AC3, AC4, AC8): identitas dan status kasus,
 * pertanyaan dengan tombol "Salin pertanyaan", lalu satu kotak jawaban per percobaan.
 * Kartu hanya menyusun; alur simpan, riwayat, dan bukti ada di ManualAnswerBox.
 */
export function ManualCaseCard({
  caseItem,
  sessionId,
  gateway,
  canEdit,
  currentUserId,
  onSaved,
  onDirtyChange,
}: Readonly<{
  caseItem: ManualCaseProgress;
  sessionId: string;
  gateway: ManualAnswerGateway;
  canEdit: boolean;
  currentUserId: string | null;
  onSaved: (response: ManualAnswerResponse) => void;
  onDirtyChange: (attemptId: string, dirty: boolean) => void;
}>) {
  return (
    <article
      aria-label={`Kasus ${caseItem.case_code}`}
      className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs space-y-3"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
            {caseItem.case_code}
          </span>
          <span className="text-xs uppercase font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
            {caseItem.split_tag}
          </span>
          <h3 className="text-sm font-semibold text-slate-900">{caseItem.title}</h3>
        </div>

        <div>
          {caseItem.filled ? (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
              Sudah terisi
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Belum terisi
            </span>
          )}
        </div>
      </header>

      <div className="space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Pertanyaan Kasus
          </h4>
          <QuestionCopyButton question={caseItem.question} caseCode={caseItem.case_code} />
        </div>
        <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-800 font-normal whitespace-pre-wrap">
          {caseItem.question}
        </div>
      </div>

      <div className="space-y-3 border-t border-slate-100 pt-3">
        <h4 className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Jawaban per percobaan ({caseItem.attempts.length})
        </h4>
        {caseItem.attempts.map((slot) => (
          <ManualAnswerBox
            key={slot.attempt_id}
            sessionId={sessionId}
            snapshotItemId={caseItem.snapshot_item_id}
            slot={slot}
            gateway={gateway}
            canEdit={canEdit}
            currentUserId={currentUserId}
            onSaved={onSaved}
            onDirtyChange={onDirtyChange}
          />
        ))}
      </div>
    </article>
  );
}
