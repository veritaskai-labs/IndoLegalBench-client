"use client";

import { useState } from "react";

import { MarkdownAnswer } from "@/components/runs/MarkdownAnswer";
import { AttemptDisclosure } from "@/components/runs/AttemptDisclosure";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { isExpandedByDefault } from "@/lib/runs/attemptDisclosure";
import { describeAttemptTiming } from "@/lib/runs/attemptTiming";
import { answerPlaceholder, attemptStatusLabel, emptyAnswerText, type AnswerContext } from "@/lib/runs/sessionDetail";
import type { AttemptResult } from "@/types/measurement";

const COPY = messages({
  id: {
    attempt: "Percobaan {n}",
    toggle: "Jawaban percobaan {n}",
    started: "Mulai",
    finished: "Selesai",
    duration: "Durasi",
    formatted: "Tampilan",
    raw: "Teks mentah",
    copy: "Salin",
    copied: "Tersalin",
    copyFailed: "Gagal menyalin, pilih teksnya lalu salin manual.",
  },
  en: {
    attempt: "Attempt {n}",
    toggle: "Answer for attempt {n}",
    started: "Started",
    finished: "Finished",
    duration: "Duration",
    formatted: "Formatted",
    raw: "Raw text",
    copy: "Copy",
    copied: "Copied",
    copyFailed: "Could not copy. Select the text and copy it manually.",
  },
});

type View = "formatted" | "raw";

const TOGGLE_BASE = "rounded-md border px-2 py-1 text-xs font-medium";
const TOGGLE_ON = `${TOGGLE_BASE} border-slate-900 bg-slate-900 text-white`;
const TOGGLE_OFF = `${TOGGLE_BASE} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;

/**
 * Satu percobaan di detail sesi (PBI-11 AC8): status, jejak waktu WIB, dan jawaban mentah sebagai
 * markdown terformat atau teks asli. Header selalu tampil; jawabannya dilipat di balik chevron
 * (SCRUM-292). Semua aturan (teks pengganti, label waktu, bawaan buka/tutup) ada di lib/runs.
 */
export function AttemptAnswer({
  attempt,
  context,
  attemptCount,
  label,
}: Readonly<{ attempt: AttemptResult; context: AnswerContext; attemptCount: number; label?: string }>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const timing = describeAttemptTiming(attempt, locale);
  const placeholder = answerPlaceholder(attempt, context, locale);
  const attemptName = fill(copy.attempt, { n: attempt.repetition_no });

  return (
    <li aria-label={attemptName} className="rounded-md border border-slate-200">
      <AttemptDisclosure
        toggleLabel={fill(copy.toggle, { n: attempt.repetition_no })}
        defaultExpanded={isExpandedByDefault(attemptCount)}
        header={
          <>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-medium text-slate-900">{attemptName}</span>
              <span>{attemptStatusLabel(attempt.status, locale)}</span>
              {label && <span className="font-mono">{label}</span>}
              {attempt.model_version && <span className="font-mono">{attempt.model_version}</span>}
            </p>
            <dl className="flex flex-wrap gap-x-4 gap-y-1">
              <TimingItem label={copy.started} value={timing.started} />
              <TimingItem label={copy.finished} value={timing.finished} />
              {timing.duration && <TimingItem label={copy.duration} value={timing.duration} />}
            </dl>
          </>
        }
      >
        {placeholder === null ? (
          <AnswerBody answer={attempt.answer_text ?? ""} copy={copy} empty={emptyAnswerText(locale)} />
        ) : (
          <p className="px-3 py-2 text-sm text-slate-500">{placeholder}</p>
        )}
      </AttemptDisclosure>
    </li>
  );
}

function TimingItem({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex gap-1">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-slate-900">{value}</dd>
    </div>
  );
}

function AnswerBody({
  answer,
  copy,
  empty,
}: Readonly<{ answer: string; copy: (typeof COPY)["id"]; empty: string }>) {
  const [view, setView] = useState<View>("formatted");
  const { status, copy: copyText } = useCopyToClipboard();

  if (answer === "") return <p className="px-3 py-2 text-sm text-slate-500">{empty}</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-3 pt-2">
        <button type="button" aria-pressed={view === "formatted"} className={view === "formatted" ? TOGGLE_ON : TOGGLE_OFF} onClick={() => setView("formatted")}>
          {copy.formatted}
        </button>
        <button type="button" aria-pressed={view === "raw"} className={view === "raw" ? TOGGLE_ON : TOGGLE_OFF} onClick={() => setView("raw")}>
          {copy.raw}
        </button>
        <button type="button" className={TOGGLE_OFF} onClick={() => void copyText(answer)}>
          {status === "copied" ? copy.copied : copy.copy}
        </button>
        {status === "failed" && (
          <output className="text-xs text-red-700">
            {copy.copyFailed}
          </output>
        )}
      </div>
      {view === "formatted" ? (
        <MarkdownAnswer source={answer} />
      ) : (
        // Teks asli apa adanya: markup dari produk tidak pernah menjadi HTML.
        <pre data-testid="raw-answer" className="max-h-96 overflow-auto px-3 py-2 font-sans text-sm break-words whitespace-pre-wrap text-slate-900">
          {answer}
        </pre>
      )}
    </div>
  );
}
