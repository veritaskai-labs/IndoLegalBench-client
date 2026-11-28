"use client";

import { useId } from "react";

/** Gabungan id untuk aria-describedby; id kosong dibuang dan hasil kosong menjadi undefined. */
export function describedBy(...ids: (string | false | null | undefined)[]): string | undefined {
  const present = ids.filter(Boolean);
  return present.length > 0 ? present.join(" ") : undefined;
}

/** Catatan kecil di bawah label. Dipakai juga oleh isian yang bukan RubricField (pilihan jalur). */
export function FieldHint({ id, children }: Readonly<{ id: string; children: string }>) {
  return (
    <p id={id} className="text-xs leading-4 text-muted">
      {children}
    </p>
  );
}

/** Tanda wajib biru seperti FormField SCRUM-343 (B1); pembaca layar memakai aria-required. */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="ml-0.5 text-accent">
      *
    </span>
  );
}

/** Label isian dengan tanda wajib di sampingnya, di luar label, supaya nama isian tetap tanpa "*". */
export function FieldLabel({ htmlFor, required, children }: Readonly<{ htmlFor: string; required: boolean; children: string }>) {
  return (
    <div className="flex items-baseline">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink">
        {children}
      </label>
      {required && <RequiredMark />}
    </div>
  );
}

/** Kelas isian bersama: 44 px di ponsel (B7), 36 px mulai sm, garis merah saat ditolak. */
export const FIELD_CLASS =
  "w-full rounded-control border border-line bg-paper px-3 text-sm text-ink placeholder:text-subtle aria-[invalid=true]:border-danger";

/**
 * Satu isian berlabel dengan catatan kecil dan pesan galat di bawahnya. Catatan dan galat dikaitkan ke
 * isian lewat aria-describedby. Pesan galat sengaja bukan role="alert": saat B5 menandai banyak isian
 * sekaligus, satu ringkasan di atas form yang diumumkan, bukan sebelas pesan. data-path memakai path
 * galat server (aspects[0].name), supaya form bisa memindahkan fokus ke isian kosong pertama.
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
  required = false,
  path,
  hideLabel = false,
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
  required?: boolean;
  /** Path galat server untuk isian ini, mis. "aspects[0].name". */
  path?: string;
  /** Label hanya untuk pembaca layar, bila judul kolom tabel sudah menamai isiannya. */
  hideLabel?: boolean;
}>) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;
  const shared = {
    id,
    value,
    placeholder,
    "data-path": path,
    "aria-required": required ? true : undefined,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": describedBy(hint && hintId, error && errorId),
  } as const;

  return (
    <div>
      {hideLabel ? (
        <label htmlFor={id} className="sr-only">
          {label}
        </label>
      ) : (
        <FieldLabel htmlFor={id} required={required}>
          {label}
        </FieldLabel>
      )}
      {hint && <FieldHint id={hintId}>{hint}</FieldHint>}
      {multiline ? (
        <textarea {...shared} rows={3} onChange={(event) => onChange(event.target.value)} className={`${FIELD_CLASS} mt-1 min-h-[72px] py-2`} />
      ) : (
        <input {...shared} type={type} onChange={(event) => onChange(event.target.value)} className={`${FIELD_CLASS} mt-1 h-11 sm:h-9`} />
      )}
      {error && (
        <p id={errorId} className="mt-1 text-xs leading-4 text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
