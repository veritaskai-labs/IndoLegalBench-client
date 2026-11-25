"use client";

import { useId, useState, type ReactNode } from "react";

/**
 * Pembungkus buka/tutup satu percobaan (SCRUM-292): header tetap tampil, isi dilipat di balik
 * tombol chevron. Komponen ini hanya mengurus status buka/tutup dan aksesibilitasnya; isi dan
 * aturan bawaan datang dari pemanggil.
 */
export function AttemptDisclosure({
  toggleLabel,
  header,
  defaultExpanded,
  children,
}: Readonly<{
  toggleLabel: string;
  header: ReactNode;
  defaultExpanded: boolean;
  children: ReactNode;
}>) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const panelId = useId();

  return (
    <>
      <div className="flex items-start gap-2 border-b border-slate-100 bg-slate-50 px-3 py-2">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={panelId}
          aria-label={toggleLabel}
          onClick={() => setExpanded((open) => !open)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-600 hover:bg-slate-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 20 20"
            className={`h-4 w-4 fill-none stroke-current stroke-2 transition-transform ${expanded ? "rotate-90" : ""}`}
          >
            <path d="M7 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <div className="min-w-0 flex-1 space-y-1 text-xs text-slate-600">{header}</div>
      </div>
      <div id={panelId} hidden={!expanded}>
        {expanded && children}
      </div>
    </>
  );
}
