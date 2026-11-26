"use client";

import type { DraftLevel } from "@/lib/rubrics/rubricDraft";
import { passingSummary } from "@/lib/rubrics/rubricFormCheck";
import { RUBRIC_HELP, RUBRIC_PLACEHOLDER } from "@/lib/rubrics/rubricHelpText";
import { RequiredMark, RubricField } from "./RubricField";

/**
 * Skala nilai 0 sampai 5 sebagai satu tabel (SCRUM-375 B2): skor, label, dan centang Lulus di baris
 * yang sama, satu catatan untuk seluruh tabel, dan ringkasan ambang lulus di bawahnya. Penanda lulus
 * tetap data, bukan aturan tetap (default lulus 4 dan 5 dari jawaban klien).
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
    <div className="space-y-3">
      <p className="text-[13px] text-muted">{RUBRIC_HELP.scale}</p>
      <div className="overflow-hidden rounded-control border border-line">
        <table className="w-full border-separate border-spacing-0 text-sm">
          <caption className="sr-only">Skala nilai</caption>
          <thead className="bg-surface text-left text-[13px] text-ink-soft">
            <tr>
              <th scope="col" className="w-14 px-3 py-2 font-medium">
                Skor
              </th>
              <th scope="col" className="px-3 py-2 font-medium">
                Label skor
                <RequiredMark />
              </th>
              <th scope="col" className="w-24 px-3 py-2 font-medium">
                Lulus
              </th>
            </tr>
          </thead>
          <tbody>
            {levels.map((level, index) => (
              <tr key={level.score}>
                <td className="border-t border-line-soft px-3 py-2 align-top">
                  <span className="mt-1 inline-flex size-7 items-center justify-center rounded-tag bg-surface text-[13px] font-medium text-ink">
                    {level.score}
                  </span>
                </td>
                <td className="border-t border-line-soft px-3 py-2 align-top">
                  <RubricField
                    label={`Label skor ${level.score}`}
                    hideLabel
                    required
                    path={`levels[${index}].label`}
                    value={level.label}
                    placeholder={index === 0 ? RUBRIC_PLACEHOLDER.levelLabel : undefined}
                    onChange={(label) => onChange(level.score, { label })}
                    error={errorFor(`levels[${index}].label`)}
                  />
                </td>
                <td className="border-t border-line-soft px-3 py-2 align-top">
                  <label className="mt-1 flex h-9 cursor-pointer items-center gap-2 text-[13px] text-ink">
                    <input
                      type="checkbox"
                      checked={level.isPassing}
                      onChange={(event) => onChange(level.score, { isPassing: event.target.checked })}
                      aria-label={`Lulus skor ${level.score}`}
                      className="size-4 accent-ink"
                    />
                    {level.isPassing && <span aria-hidden="true">Lulus</span>}
                  </label>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="rounded-control bg-surface px-3 py-2 text-[13px] text-ink-soft">{passingSummary(levels)}</p>
    </div>
  );
}
