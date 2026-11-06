"use client";

import type { DraftLevel } from "@/lib/rubrics/rubricDraft";
import { RubricField } from "./RubricField";

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
            onChange={(label) => onChange(level.score, { label })}
            error={errorFor(`levels[${index}].label`)}
          />
          <label className="flex items-center gap-2 pb-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={level.isPassing}
              onChange={(event) => onChange(level.score, { isPassing: event.target.checked })}
              aria-label={`Lulus skor ${level.score}`}
            />
            Lulus
          </label>
        </div>
      ))}
    </fieldset>
  );
}
