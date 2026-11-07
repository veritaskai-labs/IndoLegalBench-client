"use client";

import { formatWib } from "@/lib/datetime/formatWib";
import type { ManualCaseProgress } from "@/types/measurement";

/**
 * Kartu status progres kasus pada sesi manual (PBI-22 AC8).
 * Menampilkan ringkasan status pengisian kasus dan slot percobaan.
 * Interaksi pengisian jawaban, salin pertanyaan, dan bukti ditangani pada subtask answer-entry.
 */
export function ManualCaseCard({ caseItem }: Readonly<{ caseItem: ManualCaseProgress }>) {
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
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Pertanyaan Kasus
        </h4>
        <div className="rounded-md bg-slate-50 p-3 text-sm text-slate-800 font-normal whitespace-pre-wrap">
          {caseItem.question}
        </div>
      </div>

      <div className="space-y-2 pt-1 border-t border-slate-100">
        <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          Slot Percobaan ({caseItem.attempts.length})
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {caseItem.attempts.map((slot) => (
            <div
              key={slot.attempt_id}
              className={`rounded-md border p-2.5 text-xs flex flex-col justify-between gap-1.5 ${
                slot.filled
                  ? "border-emerald-200 bg-emerald-50/40 text-emerald-950"
                  : "border-slate-200 bg-slate-50 text-slate-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">Percobaan {slot.repetition_no}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[11px] font-medium ${
                    slot.filled
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-200 text-slate-700"
                  }`}
                >
                  {slot.filled ? "Terisi" : "Belum diisi"}
                </span>
              </div>
              {slot.answered_at_platform && (
                <span className="text-[11px] text-slate-500">
                  Diperoleh: {formatWib(slot.answered_at_platform)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </article>
  );
}
