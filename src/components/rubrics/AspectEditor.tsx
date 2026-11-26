"use client";

import { useId } from "react";

import { Button } from "@/components/ui";
import type { DraftAspect, DraftLevel } from "@/lib/rubrics/rubricDraft";
import { aspectSectionId, GRADER_PATH_LABEL } from "@/lib/rubrics/rubricFormCheck";
import { RUBRIC_HELP, RUBRIC_PLACEHOLDER } from "@/lib/rubrics/rubricHelpText";
import type { GraderPath } from "@/types/rubric";
import { FormCard } from "./FormCard";
import { describedBy, FIELD_CLASS, FieldHint, FieldLabel, RubricField } from "./RubricField";

/** Satu baris deskripsi (B3): skor dan namanya dari Skala nilai di kiri, isian di kanan. */
function DescriptorRow({
  aspectNumber,
  level,
  value,
  placeholder,
  onChange,
}: Readonly<{ aspectNumber: number; level: DraftLevel; value: string; placeholder?: string; onChange: (text: string) => void }>) {
  const id = useId();
  const nameId = `${id}-nama`;
  const hasName = level.label.trim() !== "";
  return (
    <div className="grid gap-2 sm:grid-cols-[140px_1fr] sm:gap-4">
      <div aria-hidden="true">
        <p className="text-sm font-medium text-ink">{`Skor ${level.score}`}</p>
        {hasName && <p className="text-xs leading-4 text-muted">{level.label}</p>}
      </div>
      {/* Nama skor dibaca sebagai deskripsi isian lewat elemen sr-only, karena kolom kiri aria-hidden. */}
      {hasName && (
        <span id={nameId} className="sr-only">
          {level.label}
        </span>
      )}
      <div>
        <label htmlFor={id} className="sr-only">{`Deskripsi aspek ${aspectNumber} skor ${level.score}`}</label>
        <textarea
          id={id}
          rows={2}
          value={value}
          placeholder={placeholder}
          aria-describedby={hasName ? nameId : undefined}
          onChange={(event) => onChange(event.target.value)}
          className={`${FIELD_CLASS} min-h-[56px] py-2`}
        />
      </div>
    </div>
  );
}

/**
 * Satu aspek rubrik sebagai bagian form (SCRUM-375 B): nama dan jalur berdampingan, bobot, definisi,
 * lalu deskripsi per skor dengan nama skornya di samping (B3) dan satu catatan untuk keenamnya.
 */
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
  /** Posisi 0-based; label memakai nomor 1-based, path galat 0-based seperti server. */
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
  const selectId = useId();
  const pathError = errorFor(`${path}.grader_path`);

  return (
    <FormCard
      id={aspectSectionId(index)}
      title={`Aspek ${number}`}
      action={
        <Button variant="ghost" size="sm" onClick={onRemove} disabled={!canRemove}>
          {`Hapus aspek ${number}`}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <RubricField
          label={`Nama aspek ${number}`}
          required
          path={`${path}.name`}
          hint={RUBRIC_HELP.aspectName}
          placeholder={RUBRIC_PLACEHOLDER.aspectName}
          value={aspect.name}
          onChange={(name) => onChange({ name })}
          error={errorFor(`${path}.name`)}
        />
        <div>
          <FieldLabel htmlFor={selectId} required>
            {`Jalur aspek ${number}`}
          </FieldLabel>
          <FieldHint id={`${selectId}-hint`}>{RUBRIC_HELP.aspectPath}</FieldHint>
          <select
            id={selectId}
            value={aspect.graderPath}
            data-path={`${path}.grader_path`}
            onChange={(event) => onChange({ graderPath: event.target.value as GraderPath })}
            aria-required="true"
            aria-invalid={pathError ? true : undefined}
            aria-describedby={describedBy(`${selectId}-hint`, pathError && `${selectId}-error`)}
            className={`${FIELD_CLASS} mt-1 h-11 sm:h-9`}
          >
            {Object.entries(GRADER_PATH_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          {pathError && (
            <p id={`${selectId}-error`} className="mt-1 text-xs leading-4 text-danger">
              {pathError}
            </p>
          )}
        </div>
        <RubricField
          label={`Bobot aspek ${number}`}
          type="number"
          path={`${path}.weight`}
          hint={RUBRIC_HELP.aspectWeight}
          placeholder={RUBRIC_PLACEHOLDER.aspectWeight}
          value={aspect.weight}
          onChange={(weight) => onChange({ weight })}
          error={errorFor(`${path}.weight`)}
        />
      </div>
      <RubricField
        label={`Definisi aspek ${number}`}
        multiline
        required
        path={`${path}.definition`}
        hint={RUBRIC_HELP.aspectDefinition}
        placeholder={RUBRIC_PLACEHOLDER.aspectDefinition}
        value={aspect.definition}
        onChange={(definition) => onChange({ definition })}
        error={errorFor(`${path}.definition`)}
      />
      <div className="space-y-3 pt-2">
        <div>
          <h3 className="text-sm font-semibold text-ink">Deskripsi per skor</h3>
          <p className="text-xs leading-4 text-muted">{RUBRIC_HELP.descriptors}</p>
        </div>
        {levels.map((level, levelIndex) => (
          <DescriptorRow
            key={level.score}
            aspectNumber={number}
            level={level}
            value={aspect.descriptors[level.score] ?? ""}
            placeholder={levelIndex === 0 ? RUBRIC_PLACEHOLDER.descriptor : undefined}
            onChange={(text) => onDescriptor(level.score, text)}
          />
        ))}
      </div>
    </FormCard>
  );
}
