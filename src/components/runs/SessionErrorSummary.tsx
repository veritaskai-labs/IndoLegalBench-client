"use client";

import { useState } from "react";

import { errorSummaryText, failedAttempts, modelVersionText } from "@/lib/runs/sessionErrors";
import type { SessionCaseResult } from "@/types/measurement";

/**
 * Ringkasan kegagalan satu sesi dengan tombol detail teknis (PBI-12 AC4). Detailnya baru
 * sebatas panggilan mana yang gagal: kontrak belum membawa pesan mentah dari penyedia, dan
 * catatan di bawah daftar mengatakan itu apa adanya supaya pembaca tidak menunggu yang tidak ada.
 */
export function SessionErrorSummary({ cases }: Readonly<{ cases: readonly SessionCaseResult[] }>) {
  const [open, setOpen] = useState(false);
  const failures = failedAttempts(cases);

  if (failures.length === 0) return null;

  return (
    <section aria-label="Ringkasan kegagalan" className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-rose-900">{errorSummaryText(failures.length)}</p>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-900 hover:bg-rose-100"
        >
          {open ? "Sembunyikan detail teknis" : "Lihat detail teknis"}
        </button>
      </div>

      {open && (
        <div className="space-y-2">
          <ul className="divide-y divide-rose-100 rounded-md border border-rose-100 bg-white">
            {failures.map((failure) => (
              <li key={failure.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                <span className="font-mono text-xs text-slate-500">{failure.caseCode}</span>
                <span className="text-sm font-medium text-slate-900">{failure.title}</span>
                <span className="text-xs text-slate-600">Pengulangan ke-{failure.repetitionNo}</span>
                <span className="text-xs text-slate-600">Model {modelVersionText(failure.modelVersion)}</span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-rose-900">
            Pesan asli dari penyedia belum dikirim oleh API, jadi yang tampil baru panggilan mana yang gagal.
          </p>
        </div>
      )}
    </section>
  );
}