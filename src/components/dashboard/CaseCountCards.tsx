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

/** AC1: jumlah kasus per status dan jumlah yang menunggu review, dengan warna yang sama seperti badge di halaman kasus. */
export function CaseCountCards({
  counts,
  total,
  waiting,
}: Readonly<{ counts: CaseCounts; total: number; waiting: number }>) {
  return (
    <section aria-labelledby="ringkasan-kasus">
      <h2
        id="ringkasan-kasus"
        className="text-sm font-semibold uppercase tracking-wide text-slate-500"
      >
        Ringkasan kasus
      </h2>

      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
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

        <li
          aria-describedby="menunggu-review-help"
          className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900"
        >
          <p className="text-sm font-medium">Menunggu review</p>
          <p className="mt-1 text-3xl font-semibold tabular-nums">{waiting}</p>
        </li>
      </ul>

      <p className="mt-2 text-sm text-slate-600">Total {total} kasus</p>
      <p id="menunggu-review-help" className="mt-1 text-xs text-slate-500">
        Angka ini bisa lebih besar dari &quot;Dalam tinjauan&quot;: kasus yang
        sudah disetujui tapi versi barunya sedang ditinjau tetap terhitung
        Disetujui, tapi ikut dihitung di sini.
      </p>
    </section>
  );
}