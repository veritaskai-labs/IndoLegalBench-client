import Link from "next/link";

import { formatWib } from "@/lib/datetime/formatWib";
import type { PendingReview } from "@/types/dashboard";

/** AC6: antrean review milik user, yang paling lama menunggu di urutan atas. */
export function ReviewQueue({ reviews }: Readonly<{ reviews: PendingReview[] }>) {
  // Server sudah mengurutkan, tapi tampilan tidak boleh bergantung pada itu.
  const ordered = [...reviews].sort((a, b) =>
    a.waiting_since.localeCompare(b.waiting_since),
  );

  return (
    <section aria-labelledby="antrean-review" className="mt-8">
      <h2
        id="antrean-review"
        className="text-sm font-semibold uppercase tracking-wide text-slate-500"
      >
        Antrean review
      </h2>

      {ordered.length === 0 ? (
        <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-600">
          Tidak ada kasus yang menunggu review Anda.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-slate-200 rounded-lg border border-slate-200">
          {ordered.map((review) => (
            <li key={review.assignment_id}>
              <Link
                href={`/reviews/${encodeURIComponent(review.assignment_id)}`}
                className="flex flex-col gap-1 p-4 hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="flex flex-wrap items-baseline gap-2">
                  <span className="font-medium text-slate-900">
                    {review.case_code}
                  </span>
                  <span className="text-slate-700">{review.title}</span>
                </span>
                <span className="text-sm text-slate-500">
                  Ronde {review.round_no} · menunggu sejak{" "}
                  {formatWib(review.waiting_since)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}