"use client";

import { DiscussionLauncher } from "./DiscussionLauncher";
import { revisionRequestsFirst } from "@/lib/reviews/verdictRules";
import { fill, messages } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import type { CaseStatus } from "@/types/case";
import type { CaseReview } from "@/types/review";
import { feedbackPresentation } from "@/lib/reviews/feedbackPresentation";
import { VerdictSummary } from "./VerdictSummary";

const COPY = messages({
  id: {
    region: "Catatan peninjau",
    title: "Catatan peninjau",
    round: "Putaran {round}",
    none: "Belum ada peninjau yang ditugaskan.",
    unavailable: "Penilaian belum tersedia.",
    discuss: "Ada yang perlu diperjelas? Diskusikan catatan ini dengan peninjau.",
    sidePanel: "Komentar dan thread dibuka di panel samping.",
  },
  en: {
    region: "Reviewer notes",
    title: "Reviewer notes",
    round: "Round {round}",
    none: "No reviewer has been assigned yet.",
    unavailable: "Verdict not available yet.",
    discuss: "Need something clarified? Discuss this note with the reviewer.",
    sidePanel: "Comments and the thread open in the side panel.",
  },
});

/**
 * Catatan peninjau dengan percakapan di panel tanpa meninggalkan editor.
 * Penilaian yang dikirim server ditampilkan apa adanya; yang null ditulis belum tersedia, bukan dikarang.
 */
export function ReviewerFeedback({
  review,
  caseStatus = null,
}: Readonly<{ review: CaseReview; caseStatus?: CaseStatus | null }>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const reviewers = revisionRequestsFirst(review.reviewers);
  const view = feedbackPresentation(caseStatus, locale);

  return (
    <section aria-label={copy.region} className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">{copy.title}</h2>
        <span className="text-xs text-slate-600">{fill(copy.round, { round: review.round_no })}</span>
      </div>

      {reviewers.length === 0 ? (
        <p className="text-sm text-slate-600">{copy.none}</p>
      ) : (
        <ul className="space-y-3">
          {reviewers.map((slot) => (
            <li key={slot.assignment_id} className="space-y-2 rounded-md border border-slate-200 bg-white p-4">
              <p className="text-sm text-slate-500">{slot.reviewer.name}</p>
              {slot.verdict === null ? (
                <p className="text-sm text-slate-500">{copy.unavailable}</p>
              ) : (
                <VerdictSummary verdict={slot.verdict} commentInDrawer={view.commentInDrawer} />
              )}
              {slot.verdict?.comment && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <p className="max-w-md text-xs leading-relaxed text-slate-500">
                    {view.readOnlyNotice === null ? copy.discuss : copy.sidePanel}
                  </p>
                  <DiscussionLauncher assignmentId={slot.assignment_id} label={view.launcherLabel} readOnlyNotice={view.readOnlyNotice} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
