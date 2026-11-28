"use client";

import { useEffect, useRef, useState } from "react";
import { Button, ConfirmDialog, FormField, openAsModal } from "@/components/ui";
import { CHROME } from "@/lib/i18n/chrome";
import { fill, messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";
import type { ReplaceReviewerBody, ReviewerOption } from "@/types/reviewAdmin";

const COPY = messages({
  id: {
    confirmTitle: "Konfirmasi penggantian reviewer",
    saving: "Menyimpan…",
    confirm: "Ganti reviewer",
    back: "Kembali",
    replaceFailed: "Gagal mengganti reviewer. Coba lagi.",
    previous: "Reviewer lama",
    next: "Reviewer baru",
    reason: "Alasan penggantian",
    ignored: "Penilaian reviewer lama tidak dihitung setelah penggantian.",
    title: "Ganti reviewer",
    caseLine: "{code} · Ronde {round}",
    choose: "Pilih reviewer",
    loadingCandidates: "Memuat kandidat reviewer…",
    noneEligible: "Tidak ada reviewer yang memenuhi syarat untuk ronde ini.",
    reasonHint: "Alasan wajib diisi dan tercatat di log audit.",
    review: "Tinjau penggantian",
  },
  en: {
    confirmTitle: "Confirm reviewer replacement",
    saving: "Saving…",
    confirm: "Replace reviewer",
    back: "Back",
    replaceFailed: "Could not replace the reviewer. Try again.",
    previous: "Previous reviewer",
    next: "New reviewer",
    reason: "Replacement reason",
    ignored: "The previous reviewer's verdict no longer counts after the replacement.",
    title: "Replace reviewer",
    caseLine: "{code} · Round {round}",
    choose: "Select a reviewer",
    loadingCandidates: "Loading reviewer candidates…",
    noneEligible: "No reviewer is eligible for this round.",
    reasonHint: "A reason is required and is recorded in the audit log.",
    review: "Review replacement",
  },
});

type Props = {
  caseCode: string;
  caseTitle: string;
  roundNo: number;
  currentReviewerId: string;
  currentReviewerName: string;
  candidates: ReviewerOption[];
  loadingCandidates?: boolean;
  notice?: string | null;
  pending: boolean;
  error: string | null;
  onConfirm: (body: ReplaceReviewerBody) => Promise<string | null | undefined> | void;
  onClose: () => void;
};

const controlClass = "w-full rounded-control border border-line bg-paper px-3 py-2 text-sm";
const actions = "flex flex-wrap justify-end gap-2";

export function SwapReviewerDialog({
  caseCode, caseTitle, roundNo, currentReviewerId, currentReviewerName, candidates,
  loadingCandidates, notice, pending, error, onConfirm, onClose,
}: Readonly<Props>) {
  const chrome = useText(CHROME);
  const copy = useText(COPY);
  const [reviewerId, setReviewerId] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => { heading.current?.focus(); }, [confirming]);

  const options = candidates.filter(item => item.id !== currentReviewerId);
  const chosen = options.find(item => item.id === reviewerId);
  const trimmed = reason.trim();
  const ready = !!chosen && !!trimmed && !loadingCandidates;
  const caseSummary = (
    <div id="swap-case" className="my-4 border-b border-line-soft pb-4">
      <p className="font-mono text-xs text-muted">{fill(copy.caseLine, { code: caseCode, round: roundNo })}</p>
      <p className="mt-1 wrap-anywhere">{caseTitle}</p>
    </div>
  );

  if (confirming && chosen) {
    return (
      <ConfirmDialog
        title={copy.confirmTitle}
        confirmLabel={pending ? copy.saving : copy.confirm}
        busyLabel={copy.saving}
        dismissLabel={copy.back}
        confirmDisabled={pending}
        onConfirm={async () => {
          const failure = await onConfirm({ new_reviewer_id: chosen.id, reason: trimmed });
          if (failure) throw new Error(failure);
        }}
        errorMessage={failure => failure instanceof Error ? failure.message : copy.replaceFailed}
        onDone={onClose} onClose={afterError => {
          if (pending) return;
          if (afterError) onClose();
          else setConfirming(false);
        }}>
        {caseSummary}
        <div className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div><dt className="text-xs text-muted">{copy.previous}</dt><dd className="wrap-anywhere">{currentReviewerName}</dd></div>
            <div><dt className="text-xs text-muted">{copy.next}</dt><dd className="wrap-anywhere">{chosen.name}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-muted">{copy.reason}</dt><dd className="whitespace-pre-wrap wrap-anywhere">{trimmed}</dd></div>
          </dl>
          <p className="rounded-control bg-surface p-3 text-sm">{copy.ignored}</p>
        </div>
      </ConfirmDialog>
    );
  }

  return (
    <dialog
      ref={openAsModal}
      aria-labelledby="swap-reviewer-title"
      aria-describedby="swap-case"
      onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-dialog border border-line bg-paper p-5 text-ink shadow-dialog backdrop:bg-black/35 sm:p-6">
      <h2 id="swap-reviewer-title" ref={heading} tabIndex={-1} className="font-serif text-2xl leading-tight">
        {copy.title}
      </h2>
      {caseSummary}
      {notice && <p className="mb-3 rounded-tag bg-warning-wash p-2 text-sm text-warning-ink">{notice}</p>}
      <div className="space-y-4">
        <p className="wrap-anywhere text-sm"><span className="text-muted">{copy.previous}</span> · {currentReviewerName}</p>
        <FormField label={copy.next} required>{control => (
          <select {...control} required value={reviewerId} disabled={loadingCandidates || !options.length}
            onChange={event => setReviewerId(event.target.value)} className={controlClass}>
            <option value="">{copy.choose}</option>
            {options.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        )}</FormField>
        {loadingCandidates && <output className="block">{copy.loadingCandidates}</output>}
        {!loadingCandidates && !notice && !options.length && <p>{copy.noneEligible}</p>}
        <FormField label={copy.reason} hint={copy.reasonHint} required>{control =>
          <textarea {...control} required rows={3} value={reason} onChange={event => setReason(event.target.value)} className={controlClass} />
        }</FormField>
        <div className={actions}>
          <Button variant="ghost" onClick={onClose}>{chrome.cancel}</Button>
          <Button disabled={!ready} onClick={() => setConfirming(true)}>{copy.review}</Button>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </dialog>
  );
}
