import { formatWib } from "@/lib/datetime/formatWib";
import type { AwaitingRevisionReview, VerdictDecision } from "@/types/review";
import { DiscussionLauncher } from "./DiscussionLauncher";

const DECISION_BADGE: Record<VerdictDecision, { label: string; className: string }> = {
  approve: { label: "Anda setuju", className: "bg-emerald-50 text-emerald-800" },
  revise: { label: "Anda meminta revisi", className: "bg-amber-50 text-amber-800" },
};

/** Satu tombol per thread: milik reviewer ini sendiri, atau milik peninjau lain di round yang sama. */
function Threads({ review }: Readonly<{ review: AwaitingRevisionReview }>) {
  if (review.thread_assignment_ids.length === 0) {
    return <p className="text-xs text-slate-500">Belum ada komentar</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {review.thread_assignment_ids.map((threadId) => (
        <DiscussionLauncher
          key={threadId}
          assignmentId={threadId}
          label={threadId === review.assignment_id ? "Komentar Anda" : "Komentar peninjau lain"}
        />
      ))}
    </div>
  );
}

/** Kasus yang sudah dinilai reviewer dan menunggu revisi Author. Urutan dari server dipertahankan. */
export function AwaitingRevisionList({ reviews }: Readonly<{ reviews: AwaitingRevisionReview[] }>) {
  return (
    <ul
      aria-label="Menunggu revisi penulis"
      className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white"
    >
      {reviews.map((review) => {
        const badge = DECISION_BADGE[review.my_decision];
        return (
          <li key={review.assignment_id} className="space-y-2 px-4 py-3">
            <span className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-mono text-slate-500">{review.case_code}</span>
              <span className="flex items-center gap-2 text-slate-500">
                <span>Putaran {review.round_no}</span>
                {review.decided_at !== null && <span>{formatWib(review.decided_at)}</span>}
              </span>
            </span>
            <span className="block text-sm font-medium text-slate-900">{review.title}</span>
            <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${badge.className}`}>
              {badge.label}
            </span>
            <Threads review={review} />
          </li>
        );
      })}
    </ul>
  );
}
