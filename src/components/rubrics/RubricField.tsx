"use client";

import { useId } from "react";

/** Gabungan id untuk aria-describedby; id kosong dibuang dan hasil kosong menjadi undefined. */
export function describedBy(...ids: (string | false | null | undefined)[]): string | undefined {
  const present = ids.filter(Boolean);
  return present.length > 0 ? present.join(" ") : undefined;
}

/** Catatan kecil di bawah label. Dipakai juga oleh isian yang bukan RubricField (pilihan jalur, centang lulus). */
export function FieldHint({ id, children }: Readonly<{ id: string; children: string }>) {
  return (
    <p id={id} className="text-xs text-slate-600">
      {children}
    </p>
  );
}

/**
 * Satu isian berlabel dengan catatan kecil dan pesan error di sampingnya. Catatan dan pesan 422
 * dari server dikaitkan ke inputnya lewat aria-describedby, jadi pembaca layar membacanya bersama
 * isian. Dipakai bersama oleh form, editor aspek, dan editor skala supaya markup-nya tidak diulang.
 */
export function RubricField({
  label,
  value,
  onChange,
  error,
  hint,
  placeholder,
  type = "text",
  multiline = false,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  /** Catatan fungsi isian, tampil di bawah label. */
  hint?: string;
  /** Contoh isian abu-abu di kolom kosong. */
  placeholder?: string;
  type?: "text" | "date" | "number";
  multiline?: boolean;
}>) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const shared = {
    id,
    value,
    placeholder,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy(hint && hintId, error && errorId),
    className:
      "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-black placeholder:text-slate-400 aria-[invalid=true]:border-red-500",
  } as const;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
      {multiline ? (
        <textarea {...shared} rows={3} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input {...shared} type={type} onChange={(event) => onChange(event.target.value)} />
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
