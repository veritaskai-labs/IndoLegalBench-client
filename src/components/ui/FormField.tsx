import { type ReactNode, useId } from "react";

/** Props the field hands to its control so label, hint and error stay connected. */
export type FieldControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
  "aria-required"?: true;
};

type Props = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optional?: boolean;
  children: (control: FieldControlProps) => ReactNode;
};

/** Labelled form row. The render prop keeps the field free of any one control type. */
export function FormField({ label, hint, error, required, optional, children }: Readonly<Props>) {
  const base = useId();
  const hintId = `${base}-hint`;
  const errorId = `${base}-error`;
  const describedBy = [hint && hintId, error && errorId].filter(Boolean).join(" ");

  const control: FieldControlProps = { id: base };
  if (describedBy) control["aria-describedby"] = describedBy;
  if (error) control["aria-invalid"] = true;
  if (required) control["aria-required"] = true;

  return (
    <div>
      <label htmlFor={base} className="mb-0.5 block text-sm font-medium">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-accent">
            *
          </span>
        )}
        {optional && (
          <span className="ml-1.5 rounded-tag bg-surface px-1.5 py-px text-[11px] font-medium text-muted">
            Opsional
          </span>
        )}
      </label>
      {hint && (
        <p id={hintId} className="mb-2 text-xs leading-4 text-muted">
          {hint}
        </p>
      )}
      {children(control)}
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs leading-4 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
