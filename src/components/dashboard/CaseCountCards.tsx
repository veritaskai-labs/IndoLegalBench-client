import { useId } from "react";

import { CASE_STATUS_LABEL, CASE_STATUS_STYLE } from "@/lib/cases/caseStatus";
import type { CaseStatus } from "@/types/case";
import type { CaseCounts } from "@/types/dashboard";

/** Urutan hidup sebuah kasus, bukan abjad. */
const ORDER: readonly CaseStatus[] = [
  "draft",
  "in_review",
  "needs_revision",
  "approved",
];

/**
 * AC1: jumlah kasus per status dan jumlah yang menunggu review, dengan warna yang sama seperti badge di
 * halaman kasus. Dipakai juga untuk kasus milik Kontributor (PBI-24 AC6): beri `title` sendiri dan jangan
 * isi `waiting`, karena kartu "Menunggu review" milik seluruh tim. Id dibuat per instance supaya dua
 * seksi di satu halaman tidak berbagi label.
 */
export function CaseCountCards({
  counts,
  total,
  waiting,
  title = "Ringkasan kasus",
  emptyNote,
}: Readonly<{
  counts: CaseCounts;
  total: number;
  waiting?: number;
  title?: string;
  emptyNote?: string;
}>) {
  const headingId = useId();
  const helpId = `${headingId}-menunggu-review`;

  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="text-sm font-semibold uppercase tracking-wide text-slate-500"
      >
        {title}
      </h2>

      <ul
        className={`mt-3 grid gap-3 sm:grid-cols-2 ${waiting === undefined ? "lg:grid-cols-4" : "lg:grid-cols-5"}`}
      >
        {ORDER.map((status) => (
          <li
            key={status}
            className={`rounded-lg border p-4 ${CASE_STATUS_STYLE[status]}`}
          >
            <p className="text-sm font-medium">{CASE_STATUS_LABEL[status]}</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {counts[status]}
            </p>
          </li>
        ))}

        {waiting !== undefined && (
          <li
            aria-describedby={helpId}
            className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"
          >
            <p className="text-sm font-medium">Menunggu review</p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">{waiting}</p>
          </li>
        )}
      </ul>

      <p className="mt-2 text-sm text-slate-600">Total {total} kasus</p>
      {total === 0 && emptyNote && (
        <p className="mt-1 text-sm text-slate-500">{emptyNote}</p>
      )}
      {waiting !== undefined && (
        <p id={helpId} className="mt-1 text-xs text-slate-500">
          Angka ini bisa lebih besar dari &quot;Dalam tinjauan&quot;: kasus yang
          sudah disetujui tapi versi barunya sedang ditinjau tetap terhitung
          Disetujui, tapi ikut dihitung di sini.
        </p>
      )}
    </section>
  );
}