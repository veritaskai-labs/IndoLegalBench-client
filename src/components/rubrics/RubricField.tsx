"use client";

import { useId } from "react";

/**
 * Satu isian berlabel dengan pesan error di sampingnya. Pesan 422 dari server ditaruh di sini
 * dan dikaitkan ke inputnya lewat aria-describedby, jadi pembaca layar membacanya bersama isian.
 * Dipakai bersama oleh form, editor aspek, dan editor skala supaya markup-nya tidak diulang.
 */
export function RubricField({
  label,
  value,
  onChange,
  error,
  type = "text",
  multiline = false,
}: Readonly<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  type?: "text" | "date" | "number";
  multiline?: boolean;
}>) {
  const id = useId();
  const errorId = `${id}-error`;
  const shared = {
    id,
    value,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? errorId : undefined,
    className: "mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm aria-[invalid=true]:border-red-500",
  } as const;

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
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
