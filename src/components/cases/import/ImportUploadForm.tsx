"use client";

import { useCallback, useRef, useState, type ChangeEvent, type SubmitEvent } from "react";
import { Button } from "@/components/ui";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import type { ImportGateway } from "@/lib/cases/importApi";
import { importErrorMessage, isFileRejected } from "@/lib/cases/importErrors";
import { NO_FILE_MESSAGE, precheckFile } from "@/lib/cases/importRules";
import type { ImportSummary } from "@/types/caseImport";

const REJECTED_TITLE = "Berkas ditolak, tidak ada kasus yang disimpan.";

/** Cek awal yang gagal di browser; pesannya langsung untuk pengguna. */
class PrecheckError extends Error {}

function uploadErrorMessage(error: unknown): string {
  if (error instanceof PrecheckError) return error.message;
  const message = importErrorMessage(error);
  return isFileRejected(error) ? `${REJECTED_TITLE} ${message}` : message;
}

/**
 * Form unggah CSV impor kasus (PBI-4 AC4, D7). Cek awal (ada berkas, .csv, tidak kosong) hanya bantuan;
 * pemeriksaan sebenarnya di server. Selama unggahan berjalan form terkunci dan klik kedua diabaikan
 * (useAsyncAction), karena impor 500 baris bisa sampai 30 detik.
 */
export function ImportUploadForm({
  gateway,
  onImported,
}: Readonly<{ gateway: Pick<ImportGateway, "uploadCsv">; onImported: (summary: ImportSummary) => void }>) {
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async () => {
    if (file === null) throw new PrecheckError(NO_FILE_MESSAGE);
    const problem = precheckFile(file);
    if (problem !== null) throw new PrecheckError(problem);
    return gateway.uploadCsv(file);
  }, [file, gateway]);

  const { run, pending, error } = useAsyncAction(upload, onImported, uploadErrorMessage);
  // Pesan yang ditutup karena pengguna memilih berkas lain; menekan Impor lagi menampilkan pesan baru.
  const [dismissed, setDismissed] = useState<string | null>(null);
  const shownError = error !== null && error !== dismissed ? error : null;

  function choose(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setDismissed(error);
  }

  function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    setDismissed(null);
    void run();
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="space-y-1.5">
        <label htmlFor="berkas-csv" className="block text-sm font-medium text-ink">
          Berkas CSV
        </label>
        <input
          ref={fileInputRef}
          id="berkas-csv"
          type="file"
          accept=".csv,text/csv"
          onChange={choose}
          disabled={pending}
          className="sr-only"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={pending}
          >
            Pilih berkas
          </Button>
          <span className="break-all text-sm text-muted">
            {file ? file.name : "Belum ada berkas yang terpilih"}
          </span>
        </div>
        {file && <p className="break-all text-xs text-muted">Dipilih: {file.name}</p>}
      </div>
      <Button type="submit" variant="primary" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Mengimpor…" : "Impor"}
      </Button>
      {pending && (
        <output className="block text-sm text-ink-soft">
          Mengimpor berkas. Ini bisa sampai 30 detik, jangan tutup halaman.
        </output>
      )}
      {shownError && (
        <p role="alert" className="text-sm text-danger">
          {shownError}
        </p>
      )}
    </form>
  );
}
