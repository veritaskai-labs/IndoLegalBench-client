import { CaseSectionList } from "@/components/cases/CaseSectionList";
import { SplitTagBadge } from "@/components/cases/SplitTagBadge";
import { answerPlaceholder, ATTEMPT_STATUS_LABEL, attemptSummary, sortedAttempts, type AnswerContext } from "@/lib/runs/sessionDetail";
import type { SessionCaseResult } from "@/types/measurement";

/**
 * Satu kasus di detail sesi: isi snapshot (AC7) dan jawaban mentah tiap percobaan (AC8).
 * Kasus test yang disamarkan untuk Developer AI hanya menampilkan status percobaan; isinya
 * sudah dikosongkan oleh server, bukan disembunyikan di sini.
 */
export function SessionCaseCard({
  item,
  context,
}: Readonly<{ item: SessionCaseResult; context: Omit<AnswerContext, "masked"> }>) {
  const answerContext: AnswerContext = { ...context, masked: item.masked };

  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
        <span className="font-mono text-xs text-slate-500">{item.case_code}</span>
        <span className="font-medium text-slate-900">{item.title}</span>
        {item.split_tag && <SplitTagBadge tag={item.split_tag} infoOnly />}
        <span className="text-xs text-slate-500">{attemptSummary(item.attempts)}</span>
      </summary>

      <div className="space-y-4 border-t border-slate-100 px-4 py-4">
        {item.masked ? (
          <p className="text-sm text-slate-600">
            Isi kasus test disembunyikan untuk Developer AI. Hanya status percobaan yang ditampilkan.
          </p>
        ) : (
          item.sections && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">Snapshot versi {item.version_no}</h3>
              <CaseSectionList sections={item.sections} />
            </section>
          )
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">Jawaban mentah</h3>
          <ol className="space-y-3">
            {sortedAttempts(item.attempts).map((attempt) => {
              const placeholder = answerPlaceholder(attempt, answerContext);
              return (
                <li
                  key={attempt.repetition_no}
                  aria-label={`Percobaan ${attempt.repetition_no}`}
                  className="rounded-md border border-slate-200"
                >
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                    <span className="font-medium text-slate-900">Percobaan {attempt.repetition_no}</span>
                    <span>{ATTEMPT_STATUS_LABEL[attempt.status]}</span>
                    {attempt.model_version && <span className="font-mono">{attempt.model_version}</span>}
                  </p>
                  {placeholder === null ? (
                    // Jawaban tampil apa adanya sebagai teks: markup dari produk tidak pernah menjadi HTML.
                    <pre className="max-h-96 overflow-auto px-3 py-2 font-sans text-sm break-words whitespace-pre-wrap text-slate-900">
                      {attempt.answer_text}
                    </pre>
                  ) : (
                    <p className="px-3 py-2 text-sm text-slate-500">{placeholder}</p>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      </div>
    </details>
  );
}
