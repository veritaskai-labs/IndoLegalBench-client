import { useId, type ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";

const CONTROL_CLASS =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 aria-[invalid=true]:border-red-600";

type FieldProps = {
  label: string;
  registration: UseFormRegisterReturn;
  /** Pesan error untuk field ini, dari validasi form atau dari server. */
  error?: string;
  /** Teks bantuan singkat di bawah label. */
  hint?: string;
};

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
      {children}
    </label>
  );
}

export function ErrorText({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} className="mt-1 text-xs text-red-700">
      {message}
    </p>
  );
}

/** Atribut aksesibilitas untuk kontrol yang tidak valid. */
export function invalidProps(errorId: string, error: string | undefined) {
  return error === undefined
    ? {}
    : { "aria-invalid": true, "aria-describedby": errorId };
}

function HintText({ id, text }: { id: string; text: string }) {
  return (
    <p id={id} className="mt-0.5 text-xs text-slate-500">
      {text}
    </p>
  );
}

/** Saat ada error, pembaca layar cukup membacakan error-nya; bantuan tetap terlihat. */
function describedBy(id: string, hint: string | undefined, error: string | undefined) {
  if (error !== undefined) return invalidProps(`${id}-error`, error);
  return hint === undefined ? {} : { "aria-describedby": `${id}-hint` };
}

export function TextField({
  label,
  registration,
  error,
  hint,
  type = "text",
}: FieldProps & { type?: "text" | "number" }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {hint !== undefined && <HintText id={`${id}-hint`} text={hint} />}
      <input
        id={id}
        type={type}
        {...registration}
        {...describedBy(id, hint, error)}
        className={CONTROL_CLASS}
      />
      {error !== undefined && <ErrorText id={errorId} message={error} />}
    </div>
  );
}

export function TextAreaField({
  label,
  registration,
  error,
  hint,
  rows = 3,
}: FieldProps & { rows?: number }) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {hint !== undefined && <HintText id={`${id}-hint`} text={hint} />}
      <textarea
        id={id}
        rows={rows}
        {...registration}
        {...describedBy(id, hint, error)}
        className={CONTROL_CLASS}
      />
      {error !== undefined && <ErrorText id={errorId} message={error} />}
    </div>
  );
}

/** Kartu satu bagian form. fieldset + legend memberi nama grup untuk pembaca layar. */
export function FormSection({
  title,
  help,
  error,
  children,
}: {
  title: string;
  /** Penjelasan singkat bagian ini untuk penulis kasus. */
  help?: string;
  /** Error untuk bagian ini secara utuh, misalnya daftar rujukan kosong. */
  error?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-lg border border-slate-200 bg-white p-6">
      <legend className="px-1 text-base font-semibold text-slate-900">{title}</legend>
      {help !== undefined && <p className="text-sm text-slate-600">{help}</p>}
      {error !== undefined && <ErrorText message={error} />}
      <div className="mt-2 space-y-4">{children}</div>
    </fieldset>
  );
}

/** Satu baris dinamis (rujukan atau jebakan) dengan tombol hapus. */
export function RowGroup({
  title,
  removeLabel,
  onRemove,
  invalid = false,
  children,
}: {
  title: string;
  removeLabel: string;
  onRemove: () => void;
  /** Baris berisi isian yang tidak valid; disorot supaya mudah ditemukan. */
  invalid?: boolean;
  children: ReactNode;
}) {
  return (
    <fieldset
      aria-invalid={invalid || undefined}
      className={`rounded-md border p-4 ${invalid ? "border-red-600 bg-red-50/40" : "border-slate-200"}`}
    >
      <legend className={`px-1 text-sm font-medium ${invalid ? "text-red-700" : "text-slate-700"}`}>
        {title}
      </legend>
      {invalid && <p className="mb-2 text-xs font-medium text-red-700">Baris ini perlu diperbaiki.</p>}
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
