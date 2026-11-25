import Link from "next/link";
import { formatWib } from "@/lib/datetime/formatWib";
import type { AssignedReview } from "@/types/review";

/** Penilaian sudah dikirim berarti kasus tinggal menunggu peninjau lain, kalau tidak giliran reviewer ini. */
function standing(review: AssignedReview): { label: string; className: string } {
  return review.my_verdict === null
    ? { label: "Menunggu penilaian Anda", className: "bg-amber-50 text-amber-800" }
    : { label: "Sudah dinilai, menunggu peninjau lain", className: "bg-emerald-50 text-emerald-800" };
}

/** Antrean tinjauan reviewer. Urutan dari server dipertahankan: round terlama lebih dulu. */
export function ReviewQueueList({ reviews }: Readonly<{ reviews: AssignedReview[] }>) {
  return (
    <ul aria-label="Antrean tinjauan" className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
      {reviews.map((review) => {
        const state = standing(review);
        return (
          <li key={review.assignment_id}>
            <Link
              href={`/reviews/${encodeURIComponent(review.assignment_id)}`}
              className="block space-y-2 px-4 py-3 hover:bg-slate-50"
            >
              <span className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-slate-500">{review.case.case_code}</span>
                <span className="flex items-center gap-2 text-slate-500">
                  <span>Putaran {review.round_no}</span>
                  {review.assigned_at !== null && <span>{formatWib(review.assigned_at)}</span>}
                </span>
              </span>
              <span className="block text-sm font-medium text-slate-900">{review.case.identity.title}</span>
              <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${state.className}`}>
                {state.label}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
