import { useId } from "react";

import type { MeasurementType } from "@/types/provider";

/** Jenis pengukuran produk AI (AC1). Tipenya dari kontrak, bukan ditulis tangan. */
export type { MeasurementType };

const OPTIONS: ReadonlyArray<{
  value: MeasurementType;
  label: string;
  helper: string;
}> = [
  {
    value: "automatic",
    label: "Otomatis",
    helper: "Dijalankan oleh sistem lewat API produk.",
  },
  {
    value: "manual",
    label: "Manual",
    helper: "Dijalankan manual dan jawabannya dicatat tim legal.",
  },
];

/**
 * AC1: pilihan paling atas di formulir produk; isian lain menyesuaikan jenis ini.
 * AC4: jenis hanya bisa dibaca setelah server menolak pergantiannya.
 */
export function MeasurementTypeField({
  value,
  onChange,
  readOnly = false,
}: Readonly<{
  value: MeasurementType | null;
  onChange: (next: MeasurementType) => void;
  readOnly?: boolean;
}>) {
  const groupId = useId();

  return (
    <fieldset className="rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-medium text-slate-900">
        Jenis pengukuran
      </legend>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => {
          const id = `${groupId}-${option.value}`;
          return (
            <div
              key={option.value}
              className="flex gap-3 rounded-lg border border-slate-200 p-3"
            >
              <input
                id={id}
                type="radio"
                name="measurement-type"
                value={option.value}
                checked={value === option.value}
                disabled={readOnly}
                onChange={() => onChange(option.value)}
                aria-describedby={`${id}-help`}
                className="mt-1"
              />
              <span>
                <label
                  htmlFor={id}
                  className="block text-sm font-medium text-slate-900"
                >
                  {option.label}
                </label>
                <span
                  id={`${id}-help`}
                  className="mt-0.5 block text-xs text-slate-600"
                >
                  {option.helper}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      {readOnly && (
        <p className="mt-3 text-xs text-slate-600">
          Jenis terkunci karena produk sudah punya riwayat pengukuran. Untuk
          produk yang salah jenis, nonaktifkan produk ini lalu daftarkan produk
          baru dengan nama berbeda.
        </p>
      )}
    </fieldset>
  );
}