import { ROUND_OUTCOME_LABEL } from "@/lib/reviews/reviewLabels";
import type { RoundDecision, RoundStatus, VerdictView } from "@/types/review";
import { DiscussionLauncher } from "./DiscussionLauncher";
import { VerdictSummary } from "./VerdictSummary";

type Props = {
  verdict: VerdictView;
  assignmentId?: string;
  roundStatus: RoundStatus;
  roundDecision: RoundDecision | null;
};

/** Hasil round yang sudah selesai, atau penantian bila peninjau lain belum menilai. */
function roundLine(roundStatus: RoundStatus, roundDecision: RoundDecision | null): string {
  if (roundStatus !== "decided") return "Menunggu peninjau lain menilai.";
  return roundDecision === null ? "Putaran tinjauan selesai." : ROUND_OUTCOME_LABEL[roundDecision];
}

/** Penilaian yang sudah dikirim reviewer. Hanya baca: setelah terkirim tidak bisa diubah dari sini. */
export function OwnVerdictNotice({ verdict, roundStatus, roundDecision, assignmentId }: Readonly<Props>) {
  return (
    <section aria-label="Penilaian terkirim" className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">Penilaian Anda</h2>

      <VerdictSummary verdict={verdict} />
      {assignmentId && verdict.comment && <DiscussionLauncher assignmentId={assignmentId} label="Buka diskusi komentar" />}

      <output className="block rounded bg-slate-50 px-3 py-2 text-xs text-slate-700">
        {roundLine(roundStatus, roundDecision)}
      </output>
    </section>
  );
}
