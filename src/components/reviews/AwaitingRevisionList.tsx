"use client";

import Link from "next/link";
import { formatWib } from "@/lib/datetime/formatWib";
import { fill, messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";
import type { AwaitingRevisionReview, VerdictDecision } from "@/types/review";
import { DiscussionLauncher } from "./DiscussionLauncher";

const COPY = messages({
  id: {
    emptyComments: "Belum ada komentar",
    yourComment: "Komentar Anda",
    otherComment: "Komentar peninjau lain",
    listLabel: "Menunggu revisi penulis",
    round: "Putaran {round}",
    youApproved: "Anda setuju",
    youRequestedRevision: "Anda meminta revisi",
  },
  en: {
    emptyComments: "No comments yet",
    yourComment: "Your comment",
    otherComment: "Other reviewer's comment",
    listLabel: "Awaiting author revision",
    round: "Round {round}",
    youApproved: "You approved",
    youRequestedRevision: "You requested revision",
  },
});

const DECISION_CLASS: Record<VerdictDecision, string> = {
  approve: "bg-emerald-50 text-emerald-800",
  revise: "bg-amber-50 text-amber-800",
};

/** Satu tombol per thread: milik reviewer ini sendiri, atau milik peninjau lain di round yang sama. */
function Threads({ review }: Readonly<{ review: AwaitingRevisionReview }>) {
  const copy = useText(COPY);
  if (review.thread_assignment_ids.length === 0) {
    return <p className="text-xs text-slate-500">{copy.emptyComments}</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {review.thread_assignment_ids.map((threadId) => (
        <DiscussionLauncher
          key={threadId}
          assignmentId={threadId}
          label={threadId === review.assignment_id ? copy.yourComment : copy.otherComment}
        />
      ))}
    </div>
  );
}

/** Kasus yang sudah dinilai reviewer dan menunggu revisi Author. Urutan dari server dipertahankan. */
export function AwaitingRevisionList({ reviews }: Readonly<{ reviews: AwaitingRevisionReview[] }>) {
  const copy = useText(COPY);
  return (
    <ul
      aria-label={copy.listLabel}
      className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white"
    >
      {reviews.map((review) => (
        <li key={review.assignment_id} className="space-y-2 px-4 py-3">
          <span className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-mono text-slate-500">{review.case_code}</span>
            <span className="flex items-center gap-2 text-slate-500">
              <span>{fill(copy.round, { round: review.round_no })}</span>
              {review.decided_at !== null && <span>{formatWib(review.decided_at)}</span>}
            </span>
          </span>
          <Link
            href={`/cases/${encodeURIComponent(review.case_id)}`}
            className="block text-sm font-medium text-slate-900 hover:underline"
          >
            {review.title}
          </Link>
          <span className={`inline-block rounded px-2 py-0.5 text-[11px] font-medium ${DECISION_CLASS[review.my_decision]}`}>
            {review.my_decision === "approve" ? copy.youApproved : copy.youRequestedRevision}
          </span>
          <Threads review={review} />
        </li>
      ))}
    </ul>
  );
}
