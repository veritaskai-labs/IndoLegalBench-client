"use client";

import { useState } from "react";

import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { saveBlob } from "@/lib/browserDownload";
import type { DrilldownGateway } from "@/lib/reports/drilldownApi";
import { canRetryDrilldown, drilldownErrorMessage } from "@/lib/reports/drilldownRules";
import { formatFileSize, safeEvidenceHref } from "@/lib/runs/manualEvidenceRules";
import type { EvidenceRead } from "@/types/measurement";

const BUTTON =
  "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
// Nama cadangan bila server tidak mengirim nama berkas; sama dengan server (manual_evidence).
const GENERIC_FILE_NAME = "bukti";

type Target = Readonly<{ reportId: string; resultId: string; caseId: string; attemptNo: number; gateway: DrilldownGateway }>;

/** Isi satu bukti: berkas dengan tombol Unduh, tautan aman, atau teks bila tautannya tidak aman. */
function EvidenceItem({
  item,
  busy,
  onDownload,
}: Readonly<{ item: EvidenceRead; busy: boolean; onDownload: () => void }>) {
  if (item.kind === "file") {
    const name = item.file_name ?? GENERIC_FILE_NAME;
    return (
      <li className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-slate-900">{name}</span>
        <span className="text-xs text-slate-500">{formatFileSize(item.size_bytes)}</span>
        <button type="button" className={BUTTON} disabled={busy} onClick={onDownload} aria-label={`Unduh ${name}`}>
          Unduh
        </button>
      </li>
    );
  }
  const href = safeEvidenceHref(item.url);
  return (
    <li className="text-sm">
      {href === null ? (
        <span className="break-all text-slate-700">{item.url}</span>
      ) : (
        <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-blue-700 underline">
          {href}
        </a>
      )}
    </li>
  );
}

/**
 * Bukti satu jawaban manual dari penelusuran laporan (PBI-16 AC4, D6 langkah 8). Hanya dirender untuk Admin dan
 * Kontributor (canOpenEvidence), jadi peran lain tidak pernah memanggil endpoint-nya; server tetap menegakkannya.
 * Hanya baca dan unduh: menambah atau menghapus bukti tetap di halaman sesi manual.
 */
export function AttemptEvidence({ reportId, resultId, caseId, attemptNo, gateway }: Target) {
  const list = useAsyncResource<EvidenceRead[]>(
    `result-evidence|${reportId}|${resultId}|${caseId}|${attemptNo}`,
    () => gateway.evidence(reportId, resultId, caseId, attemptNo),
    drilldownErrorMessage,
  );
  const [busy, setBusy] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  async function download(item: EvidenceRead) {
    setBusy(true);
    setDownloadError(null);
    try {
      const file = await gateway.evidenceFile(reportId, resultId, caseId, item.id);
      saveBlob(file, item.file_name ?? GENERIC_FILE_NAME);
    } catch (failure) {
      setDownloadError(drilldownErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-label={`Bukti percobaan ${attemptNo}`} className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-600">Bukti</h4>
      {list.status === "loading" && <LoadingState label="Memuat bukti…" />}
      {list.status === "error" && (
        <ErrorState message={list.message} onRetry={canRetryDrilldown(list.message) ? list.reload : undefined} />
      )}
      {list.status === "ready" &&
        (list.data.length === 0 ? (
          <p className="text-sm text-slate-500">Tidak ada bukti.</p>
        ) : (
          <ul className="space-y-1">
            {list.data.map((item) => (
              <EvidenceItem key={item.id} item={item} busy={busy} onDownload={() => void download(item)} />
            ))}
          </ul>
        ))}
      {downloadError && (
        <p role="alert" className="text-sm text-red-700">
          {downloadError}
        </p>
      )}
    </section>
  );
}
