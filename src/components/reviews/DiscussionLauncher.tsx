"use client";

import { useState } from "react";
import { DiscussionDrawer } from "./DiscussionDrawer";

type Props = { assignmentId: string; label?: string };

/** Panel ditutup tanpa membuang draf balasan selama kartu masih terpasang. */
export function DiscussionLauncher({ assignmentId, label = "Balas komentar" }: Readonly<Props>) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog"
        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h8M8 14h5M5 20l3-3h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 1 2Z" /></svg>
        {label}
      </button>
      {open && <DiscussionDrawer assignmentId={assignmentId} draft={draft} onDraftChange={setDraft} onClose={() => setOpen(false)} />}
    </>
  );
}
