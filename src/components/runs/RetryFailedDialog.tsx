"use client";

import { useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { controlErrorMessage, type FailedCase, retrySelection } from "@/lib/runs/sessionControl";
import { type RetrySelection, retrySession } from "@/lib/runs/sessionControlApi";
import type { SessionDetail, SessionRetryResponse } from "@/types/measurement";

const COPY = messages({
  id: {
    title: "Coba ulang yang gagal?",
    confirm: "Coba ulang",
    busy: "Memproses…",
    body: "Percobaan yang gagal pada kasus yang dicentang akan dipanggil ulang. Jawaban yang sudah berhasil tidak diubah, dan sesi “{label}” berjalan lagi sampai selesai.",
    legend: "Kasus dengan percobaan gagal",
    all: "Semua yang gagal ({count} kasus)",
    item: "{label} ({count} gagal)",
  },
  en: {
    title: "Retry the failed calls?",
    confirm: "Retry",
    busy: "Processing…",
    body: "Failed attempts on the selected cases will be called again. Answers that already succeeded are not changed, and session “{label}” runs again until it finishes.",
    legend: "Cases with failed attempts",
    all: "All that failed ({count} cases)",
    item: "{label} ({count} failed)",
  },
});

/**
 * Coba ulang yang gagal (PBI-12 AC3): satu checkbox per kasus yang punya percobaan gagal, ditambah
 * "Semua yang gagal". Semua kasus tercentang sejak awal, jadi mengulang semuanya cukup satu klik;
 * tanpa centang, tombolnya mati. Jawaban yang sudah berhasil tidak ikut diulang (server#99).
 */
export function RetryFailedDialog({
  session,
  failed,
  onRetried,
  onClose,
}: Readonly<{
  session: Pick<SessionDetail, "id" | "label">;
  failed: ReadonlyArray<FailedCase>;
  onRetried: (result: SessionRetryResponse) => void;
  onClose: (afterError: boolean) => void;
}>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const [chosen, setChosen] = useState<ReadonlySet<string>>(() => new Set(failed.map((item) => item.key)));
  const selection = retrySelection(chosen, failed);
  const allChosen = chosen.size === failed.length;

  function toggle(key: string) {
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleAll() {
    setChosen(allChosen ? new Set() : new Set(failed.map((item) => item.key)));
  }

  return (
    <ConfirmDialog
      title={copy.title}
      confirmLabel={copy.confirm}
      busyLabel={copy.busy}
      confirmDisabled={selection === null}
      // confirmDisabled mematikan tombol selama selection null, jadi di sini selalu ada pilihan.
      onConfirm={() => retrySession(session.id, selection as RetrySelection)}
      errorMessage={(error) => controlErrorMessage(error, locale)}
      onDone={onRetried}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">{fill(copy.body, { label: session.label })}</p>
      <fieldset className="mt-4">
        <legend className="sr-only">{copy.legend}</legend>
        <label className="flex items-center gap-2 border-b border-slate-200 pb-2 text-sm font-medium text-slate-900">
          <input type="checkbox" checked={allChosen} onChange={toggleAll} />
          {fill(copy.all, { count: failed.length })}
        </label>
        <ul className="mt-2 max-h-60 space-y-2 overflow-y-auto">
          {failed.map((item) => (
            <li key={item.key}>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" className="mt-0.5" checked={chosen.has(item.key)} onChange={() => toggle(item.key)} />
                {fill(copy.item, { label: item.label, count: item.attemptIds.length })}
              </label>
            </li>
          ))}
        </ul>
      </fieldset>
    </ConfirmDialog>
  );
}
