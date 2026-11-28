"use client";

import Link from "next/link";
import { formatWib } from "@/lib/datetime/formatWib";
import { fill, messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";
import type { AssignedReview } from "@/types/review";

const COPY = messages({
  id: {
    waiting: "Menunggu penilaian Anda",
    rated: "Sudah dinilai, menunggu peninjau lain",
    listLabel: "Antrean tinjauan",
    round: "Putaran {round}",
  },
  en: {
    waiting: "Waiting for your verdict",
    rated: "Reviewed, waiting for the other reviewer",
    listLabel: "Review queue",
    round: "Round {round}",
  },
});

/** Antrean tinjauan reviewer. Urutan dari server dipertahankan: round terlama lebih dulu. */
export function ReviewQueueList({ reviews }: Readonly<{ reviews: AssignedReview[] }>) {
  const copy = useText(COPY);
  return (
    <ul aria-label={copy.listLabel} className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
      {reviews.map((review) => {
        const waiting = review.my_verdict === null;
        return (
          <li key={review.assignment_id}>
            <Link
              href={`/reviews/${encodeURIComponent(review.assignment_id)}`}
              className="block space-y-2 px-4 py-3 hover:bg-slate-50"
            >
              <span className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-slate-500">{review.case.case_code}</span>
                <span className="flex items-center gap-2 text-slate-500">
                  <span>{fill(copy.round, { round: review.round_no })}</span>
                  {review.assigned_at !== null && <span>{formatWib(review.assigned_at)}</span>}
                </span>
              </span>
              <span className="block text-sm font-medium text-slate-900">{review.case.identity.title}</span>
              <span
                className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${
                  waiting ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"
                }`}
              >
                {waiting ? copy.waiting : copy.rated}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
