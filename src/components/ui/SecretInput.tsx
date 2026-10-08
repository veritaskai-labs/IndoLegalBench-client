"use client";

import { useId, useState } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Teks bantuan di bawah label, misalnya petunjuk kredensial tersimpan. */
  hint?: string;
  error?: string | null;
  /** Diteruskan ke input, misalnya "new-password" supaya browser tidak mengisi otomatis. */
  autoComplete?: string;
  /** Tandai wajib: tanda * di sebelah label dan aria-required. */
  required?: boolean;
};

/**
 * Input rahasia dengan tombol tampil/sembunyi (SCRUM-118). Hanya memegang
 * nilai baru yang sedang diketik; nilai tersimpan tidak pernah dimuat ke sini
 * karena server tidak pernah mengembalikannya (PBI-10 AC2).
 */
export function SecretInput({
  label,
  value,
  onChange,
  hint,
  error,
  autoComplete = "new-password",
  required = false,
}: Props) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const describedBy =
    [error ? `${id}-error` : null, hint ? `${id}-hint` : null].filter(Boolean).join(" ") ||
    undefined;

  return (
    <div>
      <div className="flex gap-1 text-sm font-medium text-slate-700">
        <label htmlFor={id}>{label}</label>
        {required && <RequiredMark />}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-0.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
      <div className="mt-1 flex gap-2">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-required={required || undefined}
          spellCheck={false}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 aria-[invalid=true]:border-red-600"
        />
        <button
          type="button"
          onClick={() => setVisible((shown) => !shown)}
          aria-pressed={visible}
          aria-label={visible ? `Sembunyikan ${label.toLowerCase()}` : `Tampilkan ${label.toLowerCase()}`}
          disabled={value === ""}
          className="shrink-0 rounded-md border border-slate-300 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          {visible ? "Sembunyikan" : "Tampilkan"}
        </button>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}

/** Tanda wajib di luar <label>, jadi nama field tetap bersih; pembaca layar memakai aria-required. */
export function RequiredMark() {
  return (
    <span aria-hidden="true" className="text-red-700">
      *
    </span>
  );
}
