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

/** AC1: jumlah kasus per status, memakai warna yang sama dengan badge di halaman kasus. */
export function CaseCountCards({
  counts,
  total,
}: Readonly<{ counts: CaseCounts; total: number }>) {
  return (
    <section aria-labelledby="ringkasan-kasus">
      <h2
        id="ringkasan-kasus"
        className="text-sm font-semibold uppercase tracking-wide text-slate-500"
      >
        Ringkasan kasus
      </h2>

      <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
      </ul>

      <p className="mt-2 text-sm text-slate-600">Total {total} kasus</p>
    </section>
  );
}