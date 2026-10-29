"use client";

import {
  MODEL_PARAMETER_FIELDS,
  type ModelParameterField,
  type ModelParameterValues,
} from "@/lib/providers/modelParameters";

type ChangeHandler = (key: string, value: string | boolean) => void;

function fieldId(key: string) {
  return `model-param-${key}`;
}

const CONTROL_CLASS =
  "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900";

function ParameterControl({
  field,
  value,
  onChange,
}: Readonly<{
  field: ModelParameterField;
  value: string | boolean | undefined;
  onChange: ChangeHandler;
}>) {
  const id = fieldId(field.key);

  if (field.kind === "toggle") {
    return (
      <input
        id={id}
        type="checkbox"
        checked={value === true}
        onChange={(event) => onChange(field.key, event.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300"
      />
    );
  }

  if (field.kind === "choice") {
    return (
      <select
        id={id}
        value={typeof value === "string" ? value : ""}
        onChange={(event) => onChange(field.key, event.target.value)}
        className={CONTROL_CLASS}
      >
        <option value="">Pakai bawaan model</option>
        {field.choices?.map((choice) => (
          <option key={choice.value} value={choice.value}>
            {choice.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      placeholder={field.placeholder}
      value={typeof value === "string" ? value : ""}
      onChange={(event) => onChange(field.key, event.target.value)}
      className={CONTROL_CLASS}
    />
  );
}

/** AC2: parameter model produk Otomatis; semuanya opsional. */
export function ModelParameterFields({
  values,
  onChange,
}: Readonly<{
  values: ModelParameterValues;
  onChange: ChangeHandler;
}>) {
  return (
    <fieldset className="rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-medium text-slate-900">
        Parameter model
      </legend>
      <p className="mb-3 text-xs text-slate-600">
        Semua parameter opsional. Yang dibiarkan kosong memakai bawaan model.
      </p>
      <div className="space-y-3">
        {MODEL_PARAMETER_FIELDS.map((field) => (
          <div key={field.key}>
            <label
              htmlFor={fieldId(field.key)}
              className="block text-sm text-slate-900"
            >
              {field.label}
            </label>
            <ParameterControl
              field={field}
              value={values[field.key]}
              onChange={onChange}
            />
            <p className="mt-1 text-xs text-slate-600">{field.helper}</p>
          </div>
        ))}
      </div>
    </fieldset>
  );
}