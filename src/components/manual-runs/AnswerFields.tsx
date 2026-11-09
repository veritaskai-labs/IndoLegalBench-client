"use client";

import { useId, useState } from "react";
import { MarkdownAnswer } from "@/components/runs/MarkdownAnswer";
import type { AnswerDraft, DraftErrors } from "@/lib/runs/manualAnswerRules";

type View = "write" | "preview";

const TAB_BASE = "rounded-md border px-2 py-1 text-xs font-medium";
const TAB_ON = `${TAB_BASE} border-slate-900 bg-slate-900 text-white`;
const TAB_OFF = `${TAB_BASE} border-slate-300 bg-white text-slate-700 hover:bg-slate-50`;
const FIELD = "w-full rounded-md border px-3 py-2 text-sm text-slate-900 read-only:bg-slate-50";

function fieldClass(invalid: boolean): string {
  return `${FIELD} ${invalid ? "border-red-400" : "border-slate-300"}`;
}

type FieldProps = Readonly<{
  attemptNo: number;
  error: string | undefined;
  disabled: boolean;
}>;

/** Catatan wajib saat platform menolak menjawab (AC6). */
function RefusalNote({ attemptNo, error, disabled, value, onChange }: FieldProps & Readonly<{ value: string; onChange: (value: string) => void }>) {
  const errorId = useId();
  return (
    <div className="space-y-1">
      <textarea
        aria-label={`Catatan penolakan Percobaan ${attemptNo}`}
        aria-invalid={error !== undefined}
        aria-describedby={error ? errorId : undefined}
        readOnly={disabled}
        rows={3}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={fieldClass(error !== undefined)}
      />
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** Kotak jawaban markdown dengan tab Tulis dan Pratinjau (AC4). */
function AnswerBox({ attemptNo, error, disabled, value, onChange }: FieldProps & Readonly<{ value: string; onChange: (value: string) => void }>) {
  const [view, setView] = useState<View>("write");
  const errorId = useId();
  return (
    <div className="space-y-1">
      <div className="flex gap-2">
        <button type="button" className={view === "write" ? TAB_ON : TAB_OFF} aria-pressed={view === "write"} onClick={() => setView("write")}>
          Tulis
        </button>
        <button type="button" className={view === "preview" ? TAB_ON : TAB_OFF} aria-pressed={view === "preview"} onClick={() => setView("preview")}>
          Pratinjau
        </button>
      </div>
      {view === "write" ? (
        <textarea
          aria-label={`Jawaban Percobaan ${attemptNo}`}
          aria-invalid={error !== undefined}
          aria-describedby={error ? errorId : undefined}
          readOnly={disabled}
          rows={8}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${fieldClass(error !== undefined)} font-mono`}
        />
      ) : (
        <div className="min-h-24 rounded-md border border-slate-200 bg-white">
          {value.trim() === "" ? (
            <p className="px-3 py-2 text-sm text-slate-500">Belum ada isi untuk dipratinjau.</p>
          ) : (
            <MarkdownAnswer source={value} />
          )}
        </div>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Isian satu percobaan (AC4, AC6, AC7): kotak markdown tanpa batas karakter dengan pratinjau,
 * opsi "Platform menolak menjawab" dengan catatan, dan tanggal-jam jawaban diperoleh. Komponen ini
 * hanya menampilkan isian dan melaporkan perubahan; aturan dan simpan ada di hook.
 */
export function AnswerFields({
  attemptNo,
  draft,
  errors,
  disabled,
  onChange,
}: Readonly<{
  attemptNo: number;
  draft: AnswerDraft;
  errors: DraftErrors;
  disabled: boolean;
  onChange: <K extends keyof AnswerDraft>(key: K, value: AnswerDraft[K]) => void;
}>) {
  const timeErrorId = useId();

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm text-slate-800">
        <input
          type="checkbox"
          checked={draft.platformRefused}
          disabled={disabled}
          onChange={(event) => onChange("platformRefused", event.target.checked)}
        />
        <span>Platform menolak menjawab</span>
      </label>

      {draft.platformRefused ? (
        <RefusalNote attemptNo={attemptNo} error={errors.note} disabled={disabled} value={draft.note} onChange={(value) => onChange("note", value)} />
      ) : (
        <AnswerBox attemptNo={attemptNo} error={errors.answer} disabled={disabled} value={draft.answerMd} onChange={(value) => onChange("answerMd", value)} />
      )}

      <div className="space-y-1">
        <label className="block text-xs font-medium text-slate-600">
          <span>Tanggal dan jam jawaban diperoleh (WIB)</span>
          <input
            type="datetime-local"
            value={draft.obtainedAt}
            disabled={disabled}
            aria-invalid={errors.obtainedAt !== undefined}
            aria-describedby={errors.obtainedAt ? timeErrorId : undefined}
            onChange={(event) => onChange("obtainedAt", event.target.value)}
            className={`mt-1 block ${fieldClass(errors.obtainedAt !== undefined)} sm:w-64`}
          />
        </label>
        {errors.obtainedAt && (
          <p id={timeErrorId} role="alert" className="text-xs text-red-700">
            {errors.obtainedAt}
          </p>
        )}
      </div>
    </div>
  );
}
