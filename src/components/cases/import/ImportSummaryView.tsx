"use client";

import Link from "next/link";
import { useState } from "react";
import { caseEditPath } from "@/lib/cases/casePaths";
import {
  FILTERS,
  STATUS_LABEL,
  defaultFilter,
  emptyFilterMessage,
  filterCount,
  hasCreatedCases,
  rowsForFilter,
  type ImportFilter,
} from "@/lib/cases/importSummary";
import { formatWib } from "@/lib/datetime/formatWib";
import type { ImportRow, ImportRowStatus, ImportSummary } from "@/types/caseImport";

const BADGE: Readonly<Record<ImportRowStatus, string>> = {
  created: "bg-emerald-50 text-emerald-800",
  failed: "bg-red-50 text-red-800",
  skipped: "bg-amber-50 text-amber-800",
};

const FILTER_BUTTON = "min-h-9 rounded-md border px-3 py-1 text-sm font-medium";

function CaseCode({ row }: Readonly<{ row: ImportRow }>) {
  if (row.case_id === null || row.case_id === undefined || !row.case_code) return <>–</>;
  return (
    <Link href={caseEditPath(row.case_id)} className="font-mono text-indigo-700 hover:underline">
      {row.case_code}
    </Link>
  );
}

/**
 * Ringkasan hasil impor CSV (PBI-4 AC7, D7): berkas, waktu, suite sementara, jumlah, lalu tabel per baris
 * dengan filter. Semua teks dari server (nama berkas, alasan) dirender sebagai teks React, tidak pernah HTML.
 */
export function ImportSummaryView({ summary }: Readonly<{ summary: ImportSummary }>) {
  const [filter, setFilter] = useState<ImportFilter>(() => defaultFilter(summary));
  const rows = rowsForFilter(summary.rows, filter);
  const created = hasCreatedCases(summary);
  const counts = [
    { label: "Dibaca", value: summary.total_rows },
    { label: "Berhasil", value: summary.success_count },
    { label: "Gagal", value: summary.failed_count },
    { label: "Dilewati", value: summary.skipped_count },
  ];

  return (
    <section aria-labelledby="ringkasan-impor" className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
      <h2 id="ringkasan-impor" className="text-base font-semibold text-slate-900">
        Ringkasan impor
      </h2>

      <dl className="grid gap-2 text-sm sm:grid-cols-[auto_1fr] sm:gap-x-4">
        <dt className="text-slate-500">Berkas</dt>
        <dd className="break-all text-slate-900">{summary.file_name}</dd>
        <dt className="text-slate-500">Waktu</dt>
        <dd className="text-slate-900">{formatWib(summary.imported_at)}</dd>
        <dt className="text-slate-500">Suite sementara</dt>
        <dd className="break-words text-slate-900">
          {created ? (
            <Link href={`/suites/${encodeURIComponent(summary.suite_id)}`} className="text-indigo-700 hover:underline">
              {summary.suite_name}
            </Link>
          ) : (
            "Tidak ada kasus yang masuk; suite sementara diarsipkan."
          )}
        </dd>
      </dl>

      <ul aria-label="Jumlah baris" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {counts.map((count) => (
          <li key={count.label} className="rounded-md bg-slate-50 p-3">
            <span className="block text-xs text-slate-500">{count.label}</span>
            <span className="block text-lg font-semibold text-slate-900">{count.value}</span>
          </li>
        ))}
      </ul>

      {created && (
        <p className="text-sm text-slate-600">
          Kasus yang berhasil masuk berstatus draf. Lengkapi field yang kosong, pilih tag dev/test, lalu ajukan review
          ke dua reviewer.
        </p>
      )}

      <fieldset aria-label="Saring baris" className="m-0 flex min-w-0 flex-wrap gap-2 border-0 p-0">
        {FILTERS.map((option) => {
          const active = option.value === filter;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(option.value)}
              className={`${FILTER_BUTTON} ${active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"}`}
            >
              {option.label} ({filterCount(summary.rows, option.value)})
            </button>
          );
        })}
      </fieldset>

      <div className="overflow-x-auto">
        <table aria-label="Hasil per baris" className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
            <tr>
              <th scope="col" className="py-2 pr-4">Baris</th>
              <th scope="col" className="py-2 pr-4">Status</th>
              <th scope="col" className="py-2 pr-4">Kode kasus</th>
              <th scope="col" className="py-2">Alasan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 align-top text-slate-700">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-4 text-center text-slate-500">
                  {emptyFilterMessage(filter)}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr key={row.row_no}>
                  <td className="py-2 pr-4 tabular-nums">{row.row_no}</td>
                  <td className="py-2 pr-4">
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${BADGE[row.status]}`}>
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2 pr-4">
                    <CaseCode row={row} />
                  </td>
                  <td className="min-w-64 py-2">{row.reason ?? "–"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
