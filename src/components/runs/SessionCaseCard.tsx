"use client";

import { CaseSectionList } from "@/components/cases/CaseSectionList";
import { SplitTagBadge } from "@/components/cases/SplitTagBadge";
import { AttemptAnswer } from "@/components/runs/AttemptAnswer";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { attemptSummary, sortedAttempts, type AnswerContext } from "@/lib/runs/sessionDetail";
import type { SessionCaseResult } from "@/types/measurement";

const COPY = messages({
  id: {
    masked: "Isi kasus test disembunyikan untuk Developer AI. Hanya status percobaan yang ditampilkan.",
    snapshot: "Snapshot versi {version}",
    answers: "Jawaban mentah",
  },
  en: {
    masked: "Test-case content is hidden from Developer AI. Only attempt status is shown.",
    snapshot: "Snapshot version {version}",
    answers: "Raw answers",
  },
});

/**
 * Satu kasus di detail sesi: isi snapshot (AC7) dan jawaban mentah tiap percobaan (AC8).
 * Kasus test yang disamarkan untuk Developer AI hanya menampilkan status percobaan; isinya
 * sudah dikosongkan oleh server, bukan disembunyikan di sini.
 */
export function SessionCaseCard({ item, sessionLabel }: Readonly<{ item: SessionCaseResult; sessionLabel?: string }>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const answerContext: AnswerContext = { masked: item.masked };

  return (
    <details className="rounded-lg border border-slate-200 bg-white">
      <summary className="flex cursor-pointer flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3 text-sm">
        <span className="font-mono text-xs text-slate-500">{item.case_code}</span>
        <span className="font-medium text-slate-900">{item.title}</span>
        {item.split_tag && <SplitTagBadge tag={item.split_tag} infoOnly />}
        <span className="text-xs text-slate-500">{attemptSummary(item.attempts, locale)}</span>
      </summary>

      <div className="space-y-4 border-t border-slate-100 px-4 py-4">
        {item.masked ? (
          <p className="text-sm text-slate-600">
            {copy.masked}
          </p>
        ) : (
          item.sections && (
            <section className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-900">{fill(copy.snapshot, { version: item.version_no ?? "" })}</h3>
              <CaseSectionList sections={item.sections} />
            </section>
          )
        )}

        <section className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-900">{copy.answers}</h3>
          <ol className="space-y-3">
            {sortedAttempts(item.attempts).map((attempt) => (
              <AttemptAnswer
                key={attempt.repetition_no}
                attempt={attempt}
                context={answerContext}
                attemptCount={item.attempts.length}
                label={sessionLabel}
              />
            ))}
          </ol>
        </section>
      </div>
    </details>
  );
}
