"use client";

import { useState } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { useSubmitVerdict } from "@/hooks/useSubmitVerdict";
import { VERDICT_HINT, VERDICT_LABEL, VERDICT_ORDER } from "@/lib/reviews/reviewLabels";
import { buildVerdictBody, canSubmitVerdict } from "@/lib/reviews/verdictRules";
import type { VerdictDecision, VerdictResult } from "@/types/review";

type Props = {
  assignmentId: string;
  /** Nomor versi kasus yang dinilai, supaya reviewer tahu penilaiannya dicatat terhadap versi mana. */
  versionNo: number;
  onSubmitted: (result: VerdictResult) => void;
};

/**
 * Form penilaian reviewer: satu keputusan, satu komentar, satu tombol kirim. Aturan kapan tombol aktif
 * dan bentuk body ada di verdictRules, pengiriman ada di useSubmitVerdict; komponen ini hanya merangkai.
 */
export function VerdictForm({ assignmentId, versionNo, onSubmitted }: Readonly<Props>) {
  const [decision, setDecision] = useState<VerdictDecision | null>(null);
  const [comment, setComment] = useState("");

  const verdict = decision === null ? null : buildVerdictBody(decision, comment);
  const { submit, pending, error } = useSubmitVerdict(assignmentId, verdict, onSubmitted);
  const canSend = canSubmitVerdict(decision, comment) && !pending;

  return (
    <form
      aria-label="Penilaian Anda"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
      className="space-y-4 rounded-lg border border-slate-200 bg-white p-5"
    >
      <h2 className="text-base font-semibold text-slate-900">Penilaian Anda</h2>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Keputusan</legend>
        {VERDICT_ORDER.map((option) => (
          <label
            key={option}
            htmlFor={`verdict-${option}`}
            className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
              decision === option ? "border-indigo-600 bg-indigo-50" : "border-slate-200 bg-white"
            }`}
          >
            <input
              id={`verdict-${option}`}
              type="radio"
              name="decision"
              value={option}
              checked={decision === option}
              onChange={() => setDecision(option)}
              className="mt-1"
            />
            <span className="space-y-1">
              <span className="block text-sm font-medium text-slate-900">{VERDICT_LABEL[option]}</span>
              <span className="block text-xs text-slate-600">{VERDICT_HINT[option]}</span>
            </span>
          </label>
        ))}
      </fieldset>

      <div className="space-y-1">
        <label htmlFor="verdict-comment" className="block text-sm font-medium text-slate-800">
          Komentar untuk penulis
        </label>
        <textarea
          id="verdict-comment"
          rows={4}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          aria-required={decision === "revise"}
          placeholder="Opsional saat menyetujui, wajib saat meminta revisi"
          className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400"
        />
      </div>

      {error !== null && <ErrorState message={error} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="submit"
          disabled={!canSend}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {pending ? "Mengirim…" : "Kirim penilaian"}
        </button>
        <p className="font-mono text-xs text-slate-500">Dicatat terhadap versi {versionNo}</p>
      </div>
    </form>
  );
}
