"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

import { openAsModal } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { saveBlob } from "@/lib/browserDownload";
import { pdfErrorMessage, reportPdfFileName, supportsInlinePdf } from "@/lib/reports/reportRules";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";

const BUTTON =
  "rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50";
const PRIMARY =
  "rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";

const noSubscription = () => () => {};

/** Kemampuan browser tidak berubah selama halaman terbuka; di server dianggap tidak bisa supaya hidrasi aman. */
function useInlinePdfSupport(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => supportsInlinePdf(navigator),
    () => false,
  );
}

/**
 * Tombol Pratinjau dan Unduh PDF laporan (Fase 0 K5). Pratinjau menampilkan berkas PDF asli dari server di dalam
 * dialog, karena grafik web horizontal sedangkan PDF vertikal (K4). Perangkat yang tidak bisa menampilkan PDF di
 * halaman, umumnya ponsel, hanya mendapat tombol Unduh. Berkas diminta sekali lalu dipakai ulang untuk pratinjau
 * dan unduhan; URL sementaranya dicabut saat dialog ditutup atau halaman ditinggalkan.
 */
export function ReportPdfActions({
  reportId,
  gateway = httpReportsGateway,
  canPreview,
}: Readonly<{ reportId: string; gateway?: ReportsGateway; canPreview?: boolean }>) {
  const detected = useInlinePdfSupport();
  const previewable = canPreview ?? detected;
  const titleId = useId();

  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<Blob | null>(null);
  const openRef = useRef(false);
  const urlRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  async function loadPdf(): Promise<Blob | null> {
    if (fileRef.current) return fileRef.current;
    setLoading(true);
    setError(null);
    try {
      fileRef.current = await gateway.pdf(reportId);
      return fileRef.current;
    } catch (failure) {
      setError(pdfErrorMessage(failure));
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function openPreview() {
    openRef.current = true;
    setOpen(true);
    const file = await loadPdf();
    if (!file || !openRef.current || urlRef.current) return;
    urlRef.current = URL.createObjectURL(file);
    setPreviewUrl(urlRef.current);
  }

  function closePreview() {
    openRef.current = false;
    setOpen(false);
    setError(null);
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPreviewUrl(null);
  }

  async function download() {
    const file = await loadPdf();
    if (file) saveBlob(file, reportPdfFileName(reportId));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {previewable && (
        <button type="button" className={BUTTON} onClick={openPreview} disabled={loading}>
          Pratinjau PDF
        </button>
      )}
      <button type="button" className={PRIMARY} onClick={download} disabled={loading}>
        Unduh PDF
      </button>
      {!previewable && <span className="text-xs text-slate-500">Pratinjau PDF tidak didukung di perangkat ini.</span>}
      {error && !open && (
        <p role="alert" className="w-full text-sm text-red-700">
          {error}
        </p>
      )}

      {open && (
        <dialog
          ref={openAsModal}
          onCancel={(event) => {
            // Escape: ditutup lewat state, supaya URL sementaranya ikut dicabut.
            event.preventDefault();
            closePreview();
          }}
          aria-labelledby={titleId}
          className="m-auto w-[calc(100%-2rem)] max-w-5xl rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 id={titleId} className="text-base font-medium">
              Pratinjau PDF
            </h2>
            <button type="button" className={BUTTON} onClick={closePreview}>
              Tutup
            </button>
          </div>
          {loading && <LoadingState label="Menyiapkan PDF…" />}
          {error && <ErrorState message={error} onRetry={openPreview} />}
          {previewUrl && (
            <iframe
              title="Pratinjau PDF laporan"
              src={previewUrl}
              className="h-[70vh] w-full rounded-lg border border-slate-200"
            />
          )}
          <div className="mt-3 flex justify-end">
            <button type="button" className={PRIMARY} onClick={download} disabled={!previewUrl}>
              Unduh PDF
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
