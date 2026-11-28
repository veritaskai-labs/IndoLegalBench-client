"use client";

import { messages, text, type Locale } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { roundOutcomeLabel } from "@/lib/reviews/reviewLabels";
import type { RoundDecision, RoundStatus, VerdictView } from "@/types/review";
import { DiscussionLauncher } from "./DiscussionLauncher";
import { VerdictSummary } from "./VerdictSummary";

const COPY = messages({
  id: {
    region: "Penilaian terkirim",
    title: "Penilaian Anda",
    openDiscussion: "Buka diskusi komentar",
    waiting: "Menunggu peninjau lain menilai.",
    finished: "Putaran tinjauan selesai.",
  },
  en: {
    region: "Submitted verdict",
    title: "Your verdict",
    openDiscussion: "Open comment discussion",
    waiting: "Waiting for the other reviewer.",
    finished: "The review round is complete.",
  },
});

/** Hasil round yang sudah selesai, atau penantian bila peninjau lain belum menilai. */
function roundLine(roundStatus: RoundStatus, roundDecision: RoundDecision | null, locale: Locale): string {
  const copy = text(COPY, locale);
  if (roundStatus !== "decided") return copy.waiting;
  return roundDecision === null ? copy.finished : roundOutcomeLabel(roundDecision, locale);
}

/** Penilaian yang sudah dikirim reviewer. Hanya baca: setelah terkirim tidak bisa diubah dari sini. */
export function OwnVerdictNotice({ verdict, roundStatus, roundDecision, assignmentId }: Readonly<{
  verdict: VerdictView;
  assignmentId?: string;
  roundStatus: RoundStatus;
  roundDecision: RoundDecision | null;
}>) {
  const copy = useText(COPY);
  const locale = useLocale();
  return (
    <section aria-label={copy.region} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">{copy.title}</h2>

      <VerdictSummary verdict={verdict} />
      {assignmentId && verdict.comment && <DiscussionLauncher assignmentId={assignmentId} label={copy.openDiscussion} />}

      <output className="block rounded bg-slate-50 px-3 py-2 text-xs text-slate-700">
        {roundLine(roundStatus, roundDecision, locale)}
      </output>
    </section>
  );
}
