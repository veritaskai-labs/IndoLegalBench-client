import type { ReportBuilder } from "@/hooks/useReportBuilder";

import { ValidationMessage } from "./ValidationMessage";

/**
 * Hasil pemeriksaan pilihan sesi (SCRUM-366): pelanggaran yang menahan tombol Buat laporan, peringatan yang
 * tidak menahan, dan keadaan pemeriksaannya sendiri. Hanya menampilkan; aturannya dari server lewat hook.
 * Pelanggaran dan peringatan satu sesi tidak tampil di sini, melainkan di baris sesinya (PickedList).
 */
export function ValidationPanel({ builder }: Readonly<{ builder: ReportBuilder }>) {
  const { validation, view } = builder;
  return (
    <div className="space-y-2">
      {validation.status === "checking" && <p className="text-sm text-slate-600">Memeriksa pilihan…</p>}
      {/* Only the result is announced; the checking note above changes after every click. */}
      <div className="space-y-2" aria-live="polite">
        {validation.status === "error" && (
          <div className="space-y-1 text-sm text-red-800">
            <p>{validation.message}</p>
            <button type="button" className="font-semibold underline" onClick={validation.reload}>
              Periksa lagi
            </button>
          </div>
        )}
        {view.general.map((violation) => (
          <ValidationMessage key={violation.code} level="error">
            {violation.message}
          </ValidationMessage>
        ))}
        {view.warnings.map((warning) => (
          <ValidationMessage key={warning.code} level="warning">
            {warning.message}
          </ValidationMessage>
        ))}
      </div>
    </div>
  );
}
