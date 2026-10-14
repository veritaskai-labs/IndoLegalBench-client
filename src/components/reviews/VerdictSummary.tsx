import { formatWib } from "@/lib/datetime/formatWib";
import { VERDICT_LABEL } from "@/lib/reviews/reviewLabels";
import type { VerdictView } from "@/types/review";

/** Satu penilaian yang sudah dikirim: keputusan, waktu (WIB), dan komentar. Dipakai untuk penilaian sendiri dan peninjau lain. */
export function VerdictSummary({ verdict }: { verdict: VerdictView }) {
  return (
    <div className="space-y-2">
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
    </div>
  );
}
