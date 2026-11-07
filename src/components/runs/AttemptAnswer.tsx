"use client";

import { useState } from "react";

import { MarkdownAnswer } from "@/components/runs/MarkdownAnswer";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { describeAttemptTiming } from "@/lib/runs/attemptTiming";
import { ATTEMPT_STATUS_LABEL, answerPlaceholder, type AnswerContext } from "@/lib/runs/sessionDetail";
import type { AttemptResult } from "@/types/measurement";

type View = "formatted" | "raw";

const TOGGLE_BASE = "rounded-md border px-2 py-1 text-xs font-medium";
const TOGGLE_ON = `${TOGGLE_BASE} border-slate-900 bg-slate-900 text-white`;
const TOGGLE_OFF = `${TOGGLE_BASE} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;

/**
 * Satu percobaan di detail sesi (PBI-11 AC8): status, jejak waktu WIB, dan jawaban mentah sebagai
 * markdown terformat atau teks asli. Semua aturan (teks pengganti, label waktu) ada di lib/runs.
 */
export function AttemptAnswer({ attempt, context }: Readonly<{ attempt: AttemptResult; context: AnswerContext }>) {
  const timing = describeAttemptTiming(attempt);
  const placeholder = answerPlaceholder(attempt, context);

  return (
    <li aria-label={`Percobaan ${attempt.repetition_no}`} className="rounded-md border border-slate-200">
      <div className="space-y-1 border-b border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-600">
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="font-medium text-slate-900">Percobaan {attempt.repetition_no}</span>
          <span>{ATTEMPT_STATUS_LABEL[attempt.status]}</span>
          {attempt.model_version && <span className="font-mono">{attempt.model_version}</span>}
        </p>
        <dl className="flex flex-wrap gap-x-4 gap-y-1">
          <TimingItem label="Mulai" value={timing.started} />
          <TimingItem label="Selesai" value={timing.finished} />
          {timing.duration && <TimingItem label="Durasi" value={timing.duration} />}
        </dl>
      </div>
      {placeholder === null ? (
        <AnswerBody answer={attempt.answer_text ?? ""} />
      ) : (
        <p className="px-3 py-2 text-sm text-slate-500">{placeholder}</p>
      )}
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

function AnswerBody({ answer }: Readonly<{ answer: string }>) {
  const [view, setView] = useState<View>("formatted");
  const { status, copy } = useCopyToClipboard();

  if (answer === "") return <p className="px-3 py-2 text-sm text-slate-500">Produk mengirim jawaban kosong.</p>;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 px-3 pt-2">
        <button type="button" aria-pressed={view === "formatted"} className={view === "formatted" ? TOGGLE_ON : TOGGLE_OFF} onClick={() => setView("formatted")}>
          Tampilan
        </button>
        <button type="button" aria-pressed={view === "raw"} className={view === "raw" ? TOGGLE_ON : TOGGLE_OFF} onClick={() => setView("raw")}>
          Teks mentah
        </button>
        <button type="button" className={TOGGLE_OFF} onClick={() => void copy(answer)}>
          {status === "copied" ? "Tersalin" : "Salin"}
        </button>
        {status === "failed" && (
          <span role="status" className="text-xs text-red-700">
            Gagal menyalin, pilih teksnya lalu salin manual.
          </span>
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
