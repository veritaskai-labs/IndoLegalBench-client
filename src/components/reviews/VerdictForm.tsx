"use client";

import { useState } from "react";
import { Button, FormField } from "@/components/ui";
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
      className="space-y-4 rounded-lg border border-line bg-paper p-5"
    >
      <h2 className="text-base font-semibold text-ink">Penilaian Anda</h2>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className="sr-only">Keputusan</legend>
        {VERDICT_ORDER.map((option) => (
          <label
            key={option}
            className={`grid cursor-pointer grid-cols-[auto_1fr] gap-x-3 gap-y-1 rounded-lg border p-3 ${
              decision === option ? "border-accent-ink bg-accent-wash" : "border-line bg-paper"
            }`}
          >
            <input
              type="radio"
              name="decision"
              value={option}
              checked={decision === option}
              onChange={() => setDecision(option)}
              className="mt-1"
            />
            <span className="block text-sm font-medium text-ink">{VERDICT_LABEL[option]}</span>
            <span className="col-start-2 block text-xs text-ink-soft">{VERDICT_HINT[option]}</span>
          </label>
        ))}
      </fieldset>

      <FormField label="Komentar untuk penulis" required={decision === "revise"} optional={decision === "approve"}
        hint={decision === "revise" ? "Jelaskan bagian yang perlu diperbaiki." : "Komentar opsional saat menyetujui kasus."}>
        {control => <textarea {...control} rows={4} value={comment} onChange={event => setComment(event.target.value)}
          aria-required={decision === "revise"} className="w-full rounded-control border border-line px-3 py-2 text-sm" />}
      </FormField>

      {error !== null && <ErrorState message={error} />}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="submit" disabled={!canSend}>
          {pending ? "Mengirim…" : "Kirim penilaian"}
        </Button>
        <p className="font-mono text-xs text-muted">Dicatat terhadap versi {versionNo}</p>
      </div>
    </form>
  );
}
