"use client";

import { useId, useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { httpPublicationGateway, type PublicationGateway } from "@/lib/reports/publicationApi";
import { publishErrorMessage, publishedListErrorMessage, replaceOptionLabel } from "@/lib/reports/publicationRules";
import type { PublicationRead, PublishedReportListItem } from "@/types/reports";

type Mode = "new" | "replace";

/**
 * Konfirmasi Terbitkan (PBI-17 AC9). Admin memilih menerbitkan sebagai laporan baru, atau mengganti satu versi
 * yang sedang terbit; versi lama tetap tersimpan (server menandainya superseded). Penerbitan hanya menaruh laporan
 * di daftar Laporan terbit untuk pengguna yang login: tanpa tautan publik, jadwal, atau notifikasi.
 */
export function PublishReportDialog({
  report,
  gateway = httpPublicationGateway,
  onPublished,
  onClose,
}: Readonly<{
  report: { id: string; title: string };
  gateway?: PublicationGateway;
  onPublished: (publication: PublicationRead) => void;
  onClose: (afterError: boolean) => void;
}>) {
  const [mode, setMode] = useState<Mode>("new");
  const [replaced, setReplaced] = useState("");
  const name = useId();

  return (
    <ConfirmDialog
      title="Terbitkan laporan?"
      confirmLabel="Terbitkan"
      busyLabel="Menerbitkan…"
      confirmDisabled={mode === "replace" && replaced === ""}
      onConfirm={() => gateway.publish(report.id, mode === "replace" ? replaced : undefined)}
      errorMessage={publishErrorMessage}
      onDone={onPublished}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        “{report.title}” akan muncul di daftar Laporan terbit dan bisa dibuka semua pengguna yang login. Tidak ada
        tautan publik, jadwal, atau notifikasi.
      </p>
      <fieldset className="mt-4 space-y-2 text-sm text-slate-900">
        <legend className="font-medium">Cara terbit</legend>
        <label className="flex items-center gap-2">
          <input type="radio" name={name} checked={mode === "new"} onChange={() => setMode("new")} />
          <span>Terbitkan sebagai laporan baru</span>
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name={name} checked={mode === "replace"} onChange={() => setMode("replace")} />
          <span>Ganti versi yang sedang terbit</span>
        </label>
      </fieldset>
      {mode === "replace" && <ReplaceChoice gateway={gateway} value={replaced} onChange={setReplaced} />}
    </ConfirmDialog>
  );
}

/** Komponen terpisah supaya daftar versi terbit hanya diminta saat Admin memilih Ganti versi. */
function ReplaceChoice({
  gateway,
  value,
  onChange,
}: Readonly<{ gateway: PublicationGateway; value: string; onChange: (publicationId: string) => void }>) {
  const selectId = useId();
  const current = useAsyncResource<PublishedReportListItem[]>(
    "published-reports",
    () => gateway.listPublished(),
    publishedListErrorMessage,
  );

  return (
    <div className="mt-3 text-sm">
      <p className="text-slate-600">Versi lama tetap tersimpan dan masih bisa dibuka, tetapi tidak lagi ada di daftar terbit.</p>
      {current.status === "loading" && <p className="mt-2 text-slate-500">Memuat versi yang sedang terbit…</p>}
      {current.status === "error" && <ErrorState className="mt-2" message={current.message} onRetry={current.reload} />}
      {current.status === "ready" && current.data.length === 0 && (
        <p className="mt-2 text-slate-600">Belum ada laporan yang sedang terbit.</p>
      )}
      {current.status === "ready" && current.data.length > 0 && (
        <>
          <label htmlFor={selectId} className="mt-2 block font-medium text-slate-900">
            Versi yang diganti
          </label>
          <select
            id={selectId}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
          >
            <option value="">Pilih versi…</option>
            {current.data.map((item) => (
              <option key={item.id} value={item.id}>
                {replaceOptionLabel(item)}
              </option>
            ))}
          </select>
        </>
      )}
    </div>
  );
}
