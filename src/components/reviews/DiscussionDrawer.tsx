"use client";

import { useCallback, useState } from "react";
import { CommentDiscussion } from "./CommentDiscussion";

type Props = { assignmentId: string; draft: string; onDraftChange: (value: string) => void; onClose: () => void; readOnlyNotice?: string | null };

/** Dialog native menjaga fokus keyboard dan membuat editor di belakang tetap terpasang. */
export function DiscussionDrawer({ assignmentId, draft, onDraftChange, onClose, readOnlyNotice = null }: Readonly<Props>) {
  const [sending, setSending] = useState(false);
  const attachDialog = useCallback((node: HTMLDialogElement) => {
    const previousFocus = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (typeof node.showModal === "function") node.showModal();
    else node.open = true;
    return () => {
      document.body.style.overflow = overflow;
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, []);

  return (
    <dialog ref={attachDialog} aria-label="Diskusi komentar peninjau" onCancel={(event) => {
      event.preventDefault();
      if (!sending) onClose();
    }} className="fixed inset-y-0 right-0 m-0 ml-auto h-dvh max-h-dvh w-full max-w-none flex-col overflow-hidden border-0 border-l border-slate-200 bg-white p-0 text-slate-900 shadow-2xl open:flex sm:max-w-xl backdrop:bg-slate-900/25">
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 px-5 py-4">
        <div><p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Ruang diskusi</p><h2 className="mt-1 text-lg font-semibold">Diskusi komentar peninjau</h2></div>
        <button type="button" onClick={onClose} disabled={sending} aria-label="Tutup diskusi" className="rounded-full p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-40">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5" aria-hidden="true"><path strokeLinecap="round" d="m6 6 12 12M6 18 18 6" /></svg>
        </button>
      </header>
      <CommentDiscussion assignmentId={assignmentId} embedded draft={draft} onDraftChange={onDraftChange} onBusyChange={setSending} readOnlyNotice={readOnlyNotice} />
    </dialog>
  );
}
