"use client";

import { messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";
import { otherReviewerIsBlind } from "@/lib/reviews/verdictRules";
import type { CaseReview, ReviewerSlot } from "@/types/review";
import { VerdictSummary } from "./VerdictSummary";

const COPY = messages({
  id: {
    region: "Peninjau kedua",
    title: "Peninjau kedua",
    anonymous: "Anonim",
    hidden:
      "Penilaian peninjau kedua sengaja disembunyikan sampai Anda dan peninjau kedua sama-sama selesai menilai, supaya tidak saling memengaruhi.",
    none: "Tidak ada penilaian.",
    unassigned: "Peninjau kedua belum ditugaskan.",
  },
  en: {
    region: "Second reviewer",
    title: "Second reviewer",
    anonymous: "Anonymous",
    hidden:
      "The second reviewer's verdict stays hidden until you and the second reviewer have both finished, so you do not influence each other.",
    none: "No verdict.",
    unassigned: "A second reviewer has not been assigned yet.",
  },
});

type Props = {
  review: CaseReview;
  /** Penugasan milik reviewer yang sedang membuka halaman; slot ini bukan "peninjau kedua". */
  myAssignmentId: string;
};

function SecondReviewerBody({ slot, review }: Readonly<{ slot: ReviewerSlot; review: CaseReview }>) {
  const copy = useText(COPY);
  const name = slot.reviewer.name;

  // K-06: selama anonim, nama peninjau kedua ikut disembunyikan.
  if (otherReviewerIsBlind(slot, review.status)) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-sm text-slate-600">
        {copy.hidden}
      </p>
    );
  }

  if (slot.verdict === null) {
    return (
      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-900">{name}</p>
        <p className="text-sm text-slate-500">{copy.none}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-slate-500">{name}</p>
      <VerdictSummary verdict={slot.verdict} />
    </div>
  );
}

/**
 * Panel peninjau kedua. Tampilan mengikuti respons server: penilaian yang null selama round terbuka
 * ditampilkan sebagai anonim, dan penilaian yang dikirim server (setelah round selesai, atau untuk admin)
 * ditampilkan apa adanya. Aturan butanya sendiri tetap milik server.
 */
export function SecondReviewerPanel({ review, myAssignmentId }: Readonly<Props>) {
  const copy = useText(COPY);
  const other = review.reviewers.find((slot) => slot.assignment_id !== myAssignmentId) ?? null;
  const blind = other !== null && otherReviewerIsBlind(other, review.status);

  return (
    <section aria-label={copy.region} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-slate-900">{copy.title}</h2>
        {blind && (
          <span className="rounded bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold tracking-wide text-indigo-700">
            {copy.anonymous}
          </span>
        )}
      </div>

      {other === null ? (
        <p className="text-sm text-slate-500">{copy.unassigned}</p>
      ) : (
        <SecondReviewerBody slot={other} review={review} />
      )}
    </section>
  );
}
