import { Badge } from "@/components/ui/Badge";
import Link from "next/link";
import { formatWib } from "@/lib/datetime/formatWib";
import type { AssignedReview } from "@/types/review";

/** Penilaian sudah dikirim berarti kasus tinggal menunggu peninjau lain, kalau tidak giliran reviewer ini. */
function standing(review: AssignedReview): { label: string; tone: "amber" | "green" } {
  return review.my_verdict === null
    ? { label: "Menunggu penilaian Anda", tone: "amber" }
    : { label: "Sudah dinilai, menunggu peninjau lain", tone: "green" };
}

/** Antrean tinjauan reviewer. Urutan dari server dipertahankan: round terlama lebih dulu. */
export function ReviewQueueList({ reviews }: Readonly<{ reviews: AssignedReview[] }>) {
  return (
    <ul aria-label="Antrean tinjauan" className="divide-y divide-line-soft rounded-lg border border-line bg-paper">
      {reviews.map((review) => {
        const state = standing(review);
        return (
          <li key={review.assignment_id}>
            <Link
              href={`/reviews/${encodeURIComponent(review.assignment_id)}`}
              className="block space-y-2 px-4 py-3 hover:bg-surface-hover"
            >
              <span className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="font-mono text-muted">{review.case.case_code}</span>
                <span className="flex items-center gap-2 text-muted">
                  <span>Ronde {review.round_no}</span>
                  {review.assigned_at !== null && <span>{formatWib(review.assigned_at)}</span>}
                </span>
              </span>
              <span className="block text-sm font-medium text-ink">{review.case.identity.title}</span>
              <Badge tone={state.tone}>{state.label}</Badge>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
