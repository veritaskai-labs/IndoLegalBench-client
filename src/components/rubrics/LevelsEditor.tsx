"use client";

import type { DraftLevel } from "@/lib/rubrics/rubricDraft";
import { RUBRIC_HELP, RUBRIC_PLACEHOLDER } from "@/lib/rubrics/rubricHelpText";
import { FieldHint, RubricField } from "./RubricField";

/**
 * Skala nilai 0 sampai 5: label tiap skor dan penanda lulus. Penanda lulus adalah data, bukan
 * aturan tetap, supaya rubrik baru boleh beda (default lulus 4 dan 5 dari jawaban klien).
 */
export function LevelsEditor({
  levels,
  errorFor,
  onChange,
}: Readonly<{
  levels: DraftLevel[];
  errorFor: (path: string) => string | null;
  onChange: (score: number, patch: Partial<Omit<DraftLevel, "score">>) => void;
}>) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">Skala nilai</legend>
      {levels.map((level, index) => (
        <div key={level.score} className="grid items-end gap-3 sm:grid-cols-[1fr_auto]">
          <RubricField
            label={`Label skor ${level.score}`}
            value={level.label}
            hint={RUBRIC_HELP.levelLabel}
            placeholder={RUBRIC_PLACEHOLDER.levelLabel}
            onChange={(label) => onChange(level.score, { label })}
            error={errorFor(`levels[${index}].label`)}
          />
          <div className="pb-2">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={level.isPassing}
                onChange={(event) => onChange(level.score, { isPassing: event.target.checked })}
                aria-label={`Lulus skor ${level.score}`}
                aria-describedby={`level-${level.score}-passing-hint`}
              />
              <span>Lulus</span>
            </label>
            <FieldHint id={`level-${level.score}-passing-hint`}>{RUBRIC_HELP.levelPassing}</FieldHint>
          </div>
        </div>
      ))}
    </fieldset>
  );
}
