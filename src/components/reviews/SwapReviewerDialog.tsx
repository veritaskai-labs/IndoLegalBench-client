"use client";

import { useEffect, useRef, useState } from "react";
import { Button, ConfirmDialog, FormField, openAsModal } from "@/components/ui";
import type { ReplaceReviewerBody, ReviewerOption } from "@/types/reviewAdmin";

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
      <p className="font-mono text-xs text-muted">{caseCode} · Ronde {roundNo}</p>
      <p className="mt-1 wrap-anywhere">{caseTitle}</p>
    </div>
  );

  if (confirming && chosen) {
    return (
      <ConfirmDialog
        title="Konfirmasi penggantian reviewer"
        confirmLabel={pending ? "Menyimpan…" : "Ganti reviewer"}
        busyLabel="Menyimpan…"
        dismissLabel="Kembali"
        confirmDisabled={pending}
        onConfirm={async () => {
          const failure = await onConfirm({ new_reviewer_id: chosen.id, reason: trimmed });
          if (failure) throw new Error(failure);
        }}
        errorMessage={failure => failure instanceof Error ? failure.message : "Gagal mengganti reviewer. Coba lagi."}
        onDone={onClose} onClose={afterError => {
          if (pending) return;
          if (afterError) onClose();
          else setConfirming(false);
        }}>
        {caseSummary}
        <div className="space-y-4">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div><dt className="text-xs text-muted">Reviewer lama</dt><dd className="wrap-anywhere">{currentReviewerName}</dd></div>
            <div><dt className="text-xs text-muted">Reviewer baru</dt><dd className="wrap-anywhere">{chosen.name}</dd></div>
            <div className="sm:col-span-2"><dt className="text-xs text-muted">Alasan penggantian</dt><dd className="whitespace-pre-wrap wrap-anywhere">{trimmed}</dd></div>
          </dl>
          <p className="rounded-control bg-surface p-3 text-sm">Penilaian reviewer lama tidak dihitung setelah penggantian.</p>
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
        Ganti reviewer
      </h2>
      {caseSummary}
      {notice && <p className="mb-3 rounded-tag bg-warning-wash p-2 text-sm text-warning-ink">{notice}</p>}
      <div className="space-y-4">
        <p className="wrap-anywhere text-sm"><span className="text-muted">Reviewer lama</span> · {currentReviewerName}</p>
        <FormField label="Reviewer baru" required>{control => (
          <select {...control} required value={reviewerId} disabled={loadingCandidates || !options.length}
            onChange={event => setReviewerId(event.target.value)} className={controlClass}>
            <option value="">Pilih reviewer</option>
            {options.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        )}</FormField>
        {loadingCandidates && <output className="block">Memuat kandidat reviewer…</output>}
        {!loadingCandidates && !notice && !options.length && <p>Tidak ada reviewer yang memenuhi syarat untuk ronde ini.</p>}
        <FormField label="Alasan penggantian" hint="Alasan wajib diisi dan tercatat di log audit." required>{control =>
          <textarea {...control} required rows={3} value={reason} onChange={event => setReason(event.target.value)} className={controlClass} />
        }</FormField>
        <div className={actions}>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button disabled={!ready} onClick={() => setConfirming(true)}>Tinjau penggantian</Button>
        </div>
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    </dialog>
  );
}
