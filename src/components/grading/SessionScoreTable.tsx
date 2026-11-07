"use client";

import { Fragment, useId, useState } from "react";

import { SplitTagBadge } from "@/components/cases/SplitTagBadge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SCORE_PATH_LABEL, toCaseRow, type AttemptRow, type CaseRow } from "@/lib/grading/gradingView";
import type { CaseGradeResult } from "@/types/grading";

const COLUMNS = 4;

/**
 * Tabel hasil per sesi (PBI-14 AC8): baris = kasus, isi = skor dua jalur dengan dua desimal.
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
            <th scope="col" className="px-4 py-2 text-right">
              {SCORE_PATH_LABEL.deterministic}
            </th>
            <th scope="col" className="px-4 py-2 text-right">
              {SCORE_PATH_LABEL.judge}
            </th>
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
                  <td className="px-4 py-2 text-right tabular-nums text-slate-900">{row.scores.deterministic}</td>
                  <td className="px-4 py-2 text-right tabular-nums text-slate-900">{row.scores.judge}</td>
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
 * Rincian satu kasus: versi rubrik hasil ini dan skor tiap percobaan. Penjelasan penilai, alasan
 * standar dan hasil per kriteria (AC5), juga label sumber Otomatis/Manual (AC9), menunggu field-nya
 * ada di AttemptGradeResult server#114; client tidak mengarang bentuknya.
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

function AttemptLine({ attempt }: Readonly<{ attempt: AttemptRow }>) {
  return (
    <li className="flex flex-wrap gap-x-3 gap-y-1 text-sm">
      <span className="font-medium text-slate-900">{attempt.label}</span>
      <span className="text-slate-600">{attempt.statusLabel}</span>
      {attempt.scored ? (
        <>
          <span className="tabular-nums text-slate-900">
            {SCORE_PATH_LABEL.deterministic} {attempt.scores.deterministic}
          </span>
          <span className="tabular-nums text-slate-900">
            {SCORE_PATH_LABEL.judge} {attempt.scores.judge}
          </span>
        </>
      ) : (
        <span className="text-amber-800">{attempt.note}</span>
      )}
    </li>
  );
}
