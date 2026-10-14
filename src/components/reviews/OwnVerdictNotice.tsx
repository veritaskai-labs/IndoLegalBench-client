import { formatWib } from "@/lib/datetime/formatWib";
import { ROUND_OUTCOME_LABEL, VERDICT_LABEL } from "@/lib/reviews/reviewLabels";
import type { RoundDecision, RoundStatus, VerdictView } from "@/types/review";

type Props = {
  verdict: VerdictView;
  roundStatus: RoundStatus;
  roundDecision: RoundDecision | null;
};

/** Hasil round yang sudah selesai, atau penantian bila peninjau lain belum menilai. */
function roundLine(roundStatus: RoundStatus, roundDecision: RoundDecision | null): string {
  if (roundStatus !== "decided") return "Menunggu peninjau lain menilai.";
  return roundDecision === null ? "Putaran tinjauan selesai." : ROUND_OUTCOME_LABEL[roundDecision];
}

/** Penilaian yang sudah dikirim reviewer. Hanya baca: setelah terkirim tidak bisa diubah dari sini. */
export function OwnVerdictNotice({ verdict, roundStatus, roundDecision }: Props) {
  return (
    <section aria-label="Penilaian terkirim" className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
      <h2 className="text-base font-semibold text-slate-900">Penilaian Anda</h2>

      <div className="space-y-1">
        <p className="text-sm font-medium text-slate-900">{VERDICT_LABEL[verdict.decision]}</p>
        {verdict.submitted_at !== null && (
          <p className="text-xs text-slate-500">{formatWib(verdict.submitted_at)}</p>
        )}
      </div>

      {verdict.comment === null ? (
        <p className="text-sm text-slate-500">Tanpa komentar</p>
      ) : (
        <p className="whitespace-pre-wrap text-sm text-slate-800">{verdict.comment}</p>
      )}

      <p role="status" className="rounded bg-slate-50 px-3 py-2 text-xs text-slate-700">
        {roundLine(roundStatus, roundDecision)}
      </p>
    </section>
  );
}
