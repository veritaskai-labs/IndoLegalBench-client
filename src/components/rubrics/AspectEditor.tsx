"use client";

import type { DraftAspect, DraftLevel } from "@/lib/rubrics/rubricDraft";
import type { GraderPath } from "@/types/rubric";
import { RubricField } from "./RubricField";

/** Jalur dirender dari tabel ini, jadi jalur baru dari server hanya menambah satu baris. */
const PATH_LABEL: Record<GraderPath, string> = {
  deterministic: "Deterministik",
  llm: "LLM judge",
};

/** Satu aspek rubrik: nama, jalur, bobot, definisi, dan deskripsi per skor. */
export function AspectEditor({
  aspect,
  index,
  levels,
  canRemove,
  errorFor,
  onChange,
  onDescriptor,
  onRemove,
}: Readonly<{
  aspect: DraftAspect;
  /** Posisi 0-based; label dan path error memakai nomor 1-based dan 0-based seperti server. */
  index: number;
  levels: DraftLevel[];
  canRemove: boolean;
  errorFor: (path: string) => string | null;
  onChange: (patch: Partial<Omit<DraftAspect, "id" | "descriptors">>) => void;
  onDescriptor: (score: number, text: string) => void;
  onRemove: () => void;
}>) {
  const number = index + 1;
  const path = `aspects[${index}]`;
  const pathError = errorFor(`${path}.grader_path`);

  return (
    <fieldset className="space-y-3 rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-semibold text-slate-900">{`Aspek ${number}`}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        <RubricField label={`Nama aspek ${number}`} value={aspect.name} onChange={(name) => onChange({ name })} error={errorFor(`${path}.name`)} />
        <div>
          <label htmlFor={`${path}-path`} className="block text-sm font-medium text-slate-700">{`Jalur aspek ${number}`}</label>
          <select
            id={`${path}-path`}
            value={aspect.graderPath}
            onChange={(event) => onChange({ graderPath: event.target.value as GraderPath })}
            aria-invalid={pathError ? true : undefined}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-black"
          >
            {Object.entries(PATH_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {pathError && <p className="mt-1 text-xs text-red-700">{pathError}</p>}
        </div>
        <RubricField
          label={`Bobot aspek ${number}`}
          type="number"
          value={aspect.weight}
          onChange={(weight) => onChange({ weight })}
          error={errorFor(`${path}.weight`)}
        />
      </div>
      <RubricField
        label={`Definisi aspek ${number}`}
        multiline
        value={aspect.definition}
        onChange={(definition) => onChange({ definition })}
        error={errorFor(`${path}.definition`)}
      />
      {levels.map((level) => (
        <RubricField
          key={level.score}
          label={`Deskripsi aspek ${number} skor ${level.score}`}
          multiline
          value={aspect.descriptors[level.score] ?? ""}
          onChange={(text) => onDescriptor(level.score, text)}
          error={null}
        />
      ))}
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700 disabled:opacity-50"
      >
        {`Hapus aspek ${number}`}
      </button>
    </fieldset>
  );
}
