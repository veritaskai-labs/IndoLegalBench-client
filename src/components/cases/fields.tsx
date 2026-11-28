"use client";

import { useId, type ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import { CHROME } from "@/lib/i18n/chrome";
import { messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";

const FIELD_COPY = messages({
  id: { remove: "Hapus", fixRow: "Baris ini perlu diperbaiki." },
  en: { remove: "Remove", fixRow: "This row needs to be fixed." },
});

export const CONTROL_CLASS =
  "mt-2 w-full rounded-control border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-subtle aria-[invalid=true]:border-danger";

type FieldProps = {
  label: string;
  registration: UseFormRegisterReturn;
  /** Pesan error untuk field ini, dari validasi form atau dari server. */
  error?: string;
  /** Teks bantuan singkat di bawah label. */
  hint?: string;
  /** Contoh isian di dalam kolom kosong, misalnya "156". */
  placeholder?: string;
  required?: boolean;
  optional?: boolean;
};

export function FieldLabel({
  htmlFor,
  required,
  optional,
  children,
}: Readonly<{
  htmlFor: string;
  required?: boolean;
  optional?: boolean;
  children: ReactNode;
}>) {
  const chrome = useText(CHROME);
  return (
    <div className="flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {children}
      </label>
      {required && (
        <span aria-hidden="true" className="text-sm font-medium text-accent">
          *
        </span>
      )}
      {optional && (
        <span className="rounded-tag bg-surface px-1.5 py-px text-[11px] font-medium text-muted">
          {chrome.optional}
        </span>
      )}
    </div>
  );
}

export function ErrorText({ id, message }: Readonly<{ id?: string; message: string }>) {
  return (
    <p id={id} className="mt-1 text-xs text-danger">
      {message}
    </p>
  );
}

/** Atribut aksesibilitas untuk kontrol yang tidak valid. */
export function invalidProps(errorId: string, error: string | undefined) {
  return error === undefined ? {} : { "aria-invalid": true, "aria-describedby": errorId };
}

export function HintText({ id, text }: Readonly<{ id: string; text: string }>) {
  return (
    <p id={id} className="mt-0.5 text-xs text-muted">
      {text}
    </p>
  );
}

/** Saat ada error, pembaca layar cukup membacakan error-nya; bantuan tetap terlihat. */
export function describedBy(id: string, hint: string | undefined, error: string | undefined) {
  if (error !== undefined) return invalidProps(`${id}-error`, error);
  return hint === undefined ? {} : { "aria-describedby": `${id}-hint` };
}

export function TextField({
  label,
  registration,
  error,
  hint,
  placeholder,
  required,
  optional,
  type = "text",
}: Readonly<FieldProps & { type?: "text" | "number" }>) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex h-full flex-col">
      <FieldLabel htmlFor={id} required={required} optional={optional}>
        {label}
      </FieldLabel>
      {hint !== undefined && <HintText id={`${id}-hint`} text={hint} />}
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        {...registration}
        {...describedBy(id, hint, error)}
        className={`${CONTROL_CLASS} mt-auto`}
      />
      <div className="min-h-5">
        {error !== undefined && <ErrorText id={errorId} message={error} />}
      </div>
    </div>
  );
}

export function TextAreaField({
  label,
  registration,
  error,
  hint,
  placeholder,
  required,
  optional,
  rows = 3,
}: Readonly<FieldProps & { rows?: number }>) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div>
      <FieldLabel htmlFor={id} required={required} optional={optional}>
        {label}
      </FieldLabel>
      {hint !== undefined && <HintText id={`${id}-hint`} text={hint} />}
      <textarea
        id={id}
        rows={rows}
        placeholder={placeholder}
        {...registration}
        {...describedBy(id, hint, error)}
        className={CONTROL_CLASS}
      />
      {error !== undefined && <ErrorText id={errorId} message={error} />}
    </div>
  );
}

/**
 * Pilihan satu nilai dari daftar kecil. Terkendali: nilai dan perubahan dikelola pemanggil.
 * `onChange` hanya menerima nilai yang ada di `options`, jadi tipenya mengikuti daftar itu.
 */
export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  error,
  hint,
  disabled = false,
}: Readonly<{
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly { value: T; label: string }[];
  error?: string;
  hint?: string;
  disabled?: boolean;
}>) {
  const id = useId();
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {hint !== undefined && <HintText id={`${id}-hint`} text={hint} />}
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          const chosen = options.find((option) => option.value === event.target.value);
          if (chosen !== undefined) onChange(chosen.value);
        }}
        {...describedBy(id, hint, error)}
        className={CONTROL_CLASS}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error !== undefined && <ErrorText id={`${id}-error`} message={error} />}
    </div>
  );
}

/** Kartu satu bagian form. fieldset + legend memberi nama grup untuk pembaca layar. */
export function FormSection({
  id,
  title,
  help,
  error,
  children,
}: Readonly<{
  id?: string;
  title: string;
  /** Penjelasan singkat bagian ini untuk penulis kasus. */
  help?: string;
  /** Error untuk bagian ini secara utuh, misalnya daftar rujukan kosong. */
  error?: string;
  children: ReactNode;
}>) {
  return (
    <fieldset
      id={id}
      className="scroll-mt-20 overflow-hidden rounded-control border border-line bg-paper p-0"
    >
      <legend className="sr-only">{title}</legend>
      <div className="border-b border-line-soft bg-surface px-6 py-4">
        <h2 className="font-serif text-[22px] font-medium leading-7 text-ink">
          {title}
        </h2>
        {help !== undefined && <p className="mt-1 text-xs text-muted">{help}</p>}
        {error !== undefined && <ErrorText message={error} />}
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </fieldset>
  );
}

/** Satu baris dinamis (rujukan hukum) dengan tombol hapus. */
export function RowGroup({
  title,
  removeLabel,
  onRemove,
  invalid = false,
  children,
}: Readonly<{
  title: string;
  removeLabel: string;
  onRemove: () => void;
  /** Baris berisi isian yang tidak valid; disorot supaya mudah ditemukan. */
  invalid?: boolean;
  children: ReactNode;
}>) {
  const copy = useText(FIELD_COPY);
  return (
    <fieldset
      aria-invalid={invalid || undefined}
      className={`rounded-control border p-4 ${
        invalid ? "border-danger bg-danger-wash/50" : "border-line"
      }`}
    >
      <legend className="sr-only">{title}</legend>
      <h3
        className={`mb-3 text-sm font-semibold ${
          invalid ? "text-danger" : "text-ink"
        }`}
      >
        {title}
      </h3>
      {invalid && (
        <p className="mb-2 text-xs font-medium text-danger">{copy.fixRow}</p>
      )}
      <div className="space-y-3">{children}</div>
      <button
        type="button"
        onClick={onRemove}
        aria-label={removeLabel}
        className="mt-3 cursor-pointer text-xs font-medium text-danger hover:underline"
      >
        {copy.remove}
      </button>
    </fieldset>
  );
}

export function AddRowButton({ label, onClick }: Readonly<{ label: string; onClick: () => void }>) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full cursor-pointer rounded-control border border-dashed border-line px-3 py-2 text-sm font-medium text-ink-soft transition-colors hover:bg-surface hover:text-ink"
    >
      {label}
    </button>
  );
}
