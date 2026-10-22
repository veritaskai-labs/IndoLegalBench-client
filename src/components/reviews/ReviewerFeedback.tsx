import { DiscussionLauncher } from "./DiscussionLauncher";
import { revisionRequestsFirst } from "@/lib/reviews/verdictRules";
import type { CaseReview } from "@/types/review";
import { VerdictSummary } from "./VerdictSummary";

/**
 * Catatan peninjau dengan percakapan di panel tanpa meninggalkan editor.
 * Penilaian yang dikirim server ditampilkan apa adanya; yang null ditulis belum tersedia, bukan dikarang.
 */
export function ReviewerFeedback({ review }: Readonly<{ review: CaseReview }>) {
  const reviewers = revisionRequestsFirst(review.reviewers);

  return (
    <section aria-label="Catatan peninjau" className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">Catatan peninjau</h2>
        <span className="text-xs text-slate-600">Putaran {review.round_no}</span>
      </div>

      {reviewers.length === 0 ? (
        <p className="text-sm text-slate-600">Belum ada peninjau yang ditugaskan.</p>
      ) : (
        <ul className="space-y-3">
          {reviewers.map((slot) => (
            <li key={slot.assignment_id} className="space-y-2 rounded-md border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">{slot.reviewer.name}</p>
              {slot.verdict === null ? (
                <p className="text-sm text-slate-500">Penilaian belum tersedia.</p>
              ) : (
                <VerdictSummary verdict={slot.verdict} />
              )}
              {slot.verdict?.comment && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <p className="max-w-md text-xs leading-relaxed text-slate-500">Ada yang perlu diperjelas? Diskusikan catatan ini dengan peninjau.</p>
                  <DiscussionLauncher assignmentId={slot.assignment_id} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
