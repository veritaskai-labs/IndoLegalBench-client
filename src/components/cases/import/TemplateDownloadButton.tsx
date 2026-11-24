"use client";

import { useCallback } from "react";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { saveBlob } from "@/lib/browserDownload";
import { TEMPLATE_FILE_NAME, type ImportGateway } from "@/lib/cases/importApi";
import { importErrorMessage } from "@/lib/cases/importErrors";

const BUTTON =
  "w-full rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 " +
  "disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto";

function saveTemplate(file: Blob): void {
  saveBlob(file, TEMPLATE_FILE_NAME);
}

/**
 * Tombol unduh template CSV impor kasus (PBI-4 AC6). Berkasnya dari server; klik kedua selama unduhan berjalan
 * diabaikan oleh useAsyncAction.
 */
export function TemplateDownloadButton({
  gateway,
}: Readonly<{ gateway: Pick<ImportGateway, "downloadTemplate"> }>) {
  const download = useCallback(() => gateway.downloadTemplate(), [gateway]);
  const { run, pending, error } = useAsyncAction(download, saveTemplate, importErrorMessage);

  return (
    <div className="space-y-2">
      <button type="button" className={BUTTON} onClick={run} disabled={pending}>
        {pending ? "Mengunduh…" : "Unduh template CSV"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
