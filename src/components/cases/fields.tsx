import { useId, type ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

const CONTROL_CLASS =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

type FieldProps = {
  label: string;
  registration: UseFormRegisterReturn;
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
      {children}
    </label>
  );
}

export function TextField({
  label,
  registration,
  type = "text",
}: FieldProps & { type?: "text" | "number" }) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <input id={id} type={type} {...registration} className={CONTROL_CLASS} />
    </div>
  );
}

export function TextAreaField({
  label,
  registration,
  rows = 3,
}: FieldProps & { rows?: number }) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <textarea id={id} rows={rows} {...registration} className={CONTROL_CLASS} />
    </div>
  );
}

/** Kartu satu bagian form. fieldset + legend memberi nama grup untuk pembaca layar. */
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-white p-6">
      <legend className="px-1 text-base font-semibold text-slate-900">{title}</legend>
      <div className="mt-2 space-y-4">{children}</div>
    </fieldset>
  );
}

/** Satu baris dinamis (rujukan atau jebakan) dengan tombol hapus. */
export function RowGroup({
  title,
  removeLabel,
  onRemove,
  children,
}: {
  title: string;
  removeLabel: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-md border border-slate-200 p-4">
      <legend className="px-1 text-sm font-medium text-slate-700">{title}</legend>
      <div className="space-y-3">{children}</div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="mt-3 text-xs font-medium text-red-700 hover:underline"
      >
        Hapus
      </button>
    </fieldset>
  );
}

export function AddRowButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-md border border-dashed border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      {label}
    </button>
  );
}
