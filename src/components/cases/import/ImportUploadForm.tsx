"use client";

import { useCallback, useState, type ChangeEvent, type FormEvent } from "react";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import type { ImportGateway } from "@/lib/cases/importApi";
import { importErrorMessage, isFileRejected } from "@/lib/cases/importErrors";
import { NO_FILE_MESSAGE, precheckFile } from "@/lib/cases/importRules";
import type { ImportSummary } from "@/types/caseImport";

const BUTTON =
  "w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 " +
  "disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

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

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDismissed(null);
    void run();
  }

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div className="space-y-1">
        <label htmlFor="berkas-csv" className="block text-sm font-medium text-slate-800">
          Berkas CSV
        </label>
        <input
          id="berkas-csv"
          type="file"
          accept=".csv,text/csv"
          onChange={choose}
          disabled={pending}
          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-slate-800"
        />
        {file && <p className="break-all text-xs text-slate-500">Dipilih: {file.name}</p>}
      </div>
      <button type="submit" className={BUTTON} disabled={pending}>
        {pending ? "Mengimpor…" : "Impor"}
      </button>
      {pending && (
        <p role="status" className="text-sm text-slate-600">
          Mengimpor berkas. Ini bisa sampai 30 detik, jangan tutup halaman.
        </p>
      )}
      {shownError && (
        <p role="alert" className="text-sm text-red-700">
          {shownError}
        </p>
      )}
    </form>
  );
}
