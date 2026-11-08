"use client";

import { Fragment, useId, useState } from "react";

import { SplitTagBadge } from "@/components/cases/SplitTagBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCORE_PATH_LABEL, SCORE_PATHS, toCaseRow, type AttemptRow, type CaseRow } from "@/lib/grading/gradingView";
import type { CaseGradeResult } from "@/types/grading";

// Kasus dan Split, lalu satu kolom per jalur skor.
const COLUMNS = 2 + SCORE_PATHS.length;

/**
 * Tabel hasil per sesi (PBI-14 AC8): baris = kasus, isi = skor tiap jalur dengan dua desimal.
 * Klik baris membuka percobaannya dan versi rubrik yang dipakai hasil ini (AC7). Semua aturan
 * tampil (format, penyamaran, gangguan teknis) sudah diputuskan toCaseRow; di sini hanya markup.
 */
export function SessionScoreTable({
  cases,
  rubricVersion,
}: Readonly<{ cases: CaseGradeResult[]; rubricVersion: string }>) {
  const idPrefix = useId();
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  const rows = cases.map(toCaseRow);

  function toggle(id: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-sm">
        <caption className="sr-only">Skor per kasus</caption>
        <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
          <tr>
            <th scope="col" className="px-4 py-2">
              Kasus
            </th>
            <th scope="col" className="px-4 py-2">
              Split
            </th>
            {SCORE_PATHS.map((path) => (
              <th key={path} scope="col" className="px-4 py-2 text-right">
                {SCORE_PATH_LABEL[path]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.length === 0 && (
            <EmptyState
              inTable
              colSpan={COLUMNS}
              title="Belum ada kasus yang dinilai."
              description="Kasus tampil di sini setelah sesi dinilai."
            />
          )}
          {rows.map((row) => {
            const detailId = `${idPrefix}-${row.id}`;
            const isOpen = open.has(row.id);
            return (
              <Fragment key={row.id}>
                <tr>
                  <td className="px-4 py-2">
                    <CaseCell row={row} detailId={detailId} isOpen={isOpen} onToggle={() => toggle(row.id)} />
                  </td>
                  <td className="px-4 py-2">{row.splitTag && <SplitTagBadge tag={row.splitTag} />}</td>
                  {SCORE_PATHS.map((path) => (
                    <td key={path} className="px-4 py-2 text-right tabular-nums text-slate-900">
                      {row.scores[path]}
                    </td>
                  ))}
                </tr>
                {isOpen && (
                  <tr>
                    <td colSpan={COLUMNS} className="bg-slate-50 px-4 py-3">
                      <CaseDetail id={detailId} row={row} rubricVersion={rubricVersion} />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Kasus tersamar tidak punya tombol: tidak ada rincian yang boleh dibuka untuk Developer AI (AC8). */
function CaseCell({
  row,
  detailId,
  isOpen,
  onToggle,
}: Readonly<{ row: CaseRow; detailId: string; isOpen: boolean; onToggle: () => void }>) {
  if (row.masked) return <span className="italic text-slate-500">{row.title}</span>;

  return (
    <button
      type="button"
      aria-expanded={isOpen}
      aria-controls={detailId}
      onClick={onToggle}
      className="flex w-full items-baseline gap-2 text-left hover:underline"
    >
      <span aria-hidden="true" className="text-slate-400">
        {isOpen ? "▾" : "▸"}
      </span>
      <span className="font-mono text-xs text-slate-500">{row.code}</span>
      <span className="font-medium text-slate-900">{row.title}</span>
    </button>
  );
}

/**
 * Rincian satu kasus: versi rubrik hasil ini, lalu tiap percobaan dengan sumbernya (AC9), skornya,
 * penjelasan penilai dan alasan standarnya (AC5). Hasil per kriteria menunggu server#114 memberi
 * `criteria` bentuk yang bertipe; sekarang masih dict bebas, jadi client tidak menebak kuncinya.
 */
function CaseDetail({ id, row, rubricVersion }: Readonly<{ id: string; row: CaseRow; rubricVersion: string }>) {
  return (
    <section id={id} aria-label={`Rincian ${row.code}`} className="space-y-2">
      <p className="text-xs text-slate-500">Versi rubrik: {rubricVersion}</p>
      {row.attempts.length === 0 ? (
        <p className="text-sm text-slate-600">Belum ada percobaan.</p>
      ) : (
        <ol className="space-y-1">
          {row.attempts.map((attempt) => (
            <AttemptLine key={attempt.id} attempt={attempt} />
          ))}
        </ol>
      )}
    </section>
  );
}

/** Penjelasan berasal dari LLM: tampil sebagai teks biasa lewat JSX, tidak pernah sebagai HTML. */
function AttemptLine({ attempt }: Readonly<{ attempt: AttemptRow }>) {
  return (
    <li className="space-y-1 text-sm">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="font-medium text-slate-900">{attempt.label}</span>
        <span className="text-slate-600">{attempt.statusLabel}</span>
        <span className="rounded bg-slate-200 px-1.5 py-0.5 text-xs text-slate-700">{attempt.sourceLabel}</span>
        {attempt.scored ? (
          SCORE_PATHS.map((path) => (
            <span key={path} className="tabular-nums text-slate-900">
              {SCORE_PATH_LABEL[path]} {attempt.scores[path]}
            </span>
          ))
        ) : (
          <span className="text-amber-800">{attempt.note}</span>
        )}
      </div>
      {attempt.explanation && (
        <p className="text-slate-700">
          <span className="font-medium">Penjelasan penilai:</span> {attempt.explanation}
        </p>
      )}
      {attempt.reasons.length > 0 && (
        <p className="text-slate-600">
          <span className="font-medium">Alasan:</span> {attempt.reasons.join(", ")}
        </p>
      )}
    </li>
  );
}
