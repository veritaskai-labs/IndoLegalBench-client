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
 * AC4: saat mengedit produk yang sudah tersimpan, jenis hanya bisa dibaca.
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
  return (
    <fieldset className="rounded-lg border border-slate-200 p-4">
      <legend className="px-1 text-sm font-medium text-slate-900">
        Jenis pengukuran
      </legend>

      <div className="mt-2 grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex gap-3 rounded-lg border border-slate-200 p-3"
          >
            <input
              type="radio"
              name="measurement-type"
              value={option.value}
              checked={value === option.value}
              disabled={readOnly}
              onChange={() => onChange(option.value)}
              className="mt-1"
            />
            <span>
              <span className="block text-sm font-medium text-slate-900">
                {option.label}
              </span>
              <span className="mt-0.5 block text-xs text-slate-600">
                {option.helper}
              </span>
            </span>
          </label>
        ))}
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