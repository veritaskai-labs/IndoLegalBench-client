"use client";

import { useId } from "react";

import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";
import { measurementTypeLabel } from "@/lib/providers/format";
import type { MeasurementType } from "@/types/provider";

/** Jenis pengukuran produk AI (AC1). Tipenya dari kontrak, bukan ditulis tangan. */
export type { MeasurementType };

const COPY = messages({
  id: {
    legend: "Jenis pengukuran",
    automaticHelp: "Dijalankan oleh sistem lewat API produk.",
    manualHelp: "Dijalankan manual dan jawabannya dicatat tim legal.",
    locked:
      "Jenis terkunci karena produk sudah punya riwayat pengukuran. Untuk produk yang salah jenis, nonaktifkan produk ini lalu daftarkan produk baru dengan nama berbeda.",
  },
  en: {
    legend: "Measurement type",
    automaticHelp: "Run by the system through the product API.",
    manualHelp: "Run by hand, and the legal team records the answer.",
    locked:
      "The type is locked because this product already has measurement history. For a product of the wrong type, deactivate this one and register a new product under a different name.",
  },
});

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
  const locale = useLocale();
  const copy = useText(COPY);
  const options = [
    {
      value: "automatic" as const,
      label: measurementTypeLabel("automatic", locale),
      helper: copy.automaticHelp,
    },
    {
      value: "manual" as const,
      label: measurementTypeLabel("manual", locale),
      helper: copy.manualHelp,
    },
  ];

  return (
    <fieldset className="rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-medium text-slate-900">{copy.legend}</legend>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {options.map((option) => {
          const id = `${groupId}-${option.value}`;
          return (
            <div key={option.value} className="flex gap-3 rounded-lg border border-slate-200 p-3">
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
                <label htmlFor={id} className="block text-sm font-medium text-slate-900">
                  {option.label}
                </label>
                <span id={`${id}-help`} className="mt-0.5 block text-xs text-slate-600">
                  {option.helper}
                </span>
              </span>
            </div>
          );
        })}
      </div>
      {readOnly && <p className="mt-3 text-xs text-slate-600">{copy.locked}</p>}
    </fieldset>
  );
}
