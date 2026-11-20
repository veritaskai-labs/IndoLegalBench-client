"use client";

import { useId, useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { httpPublicationGateway, type PublicationGateway } from "@/lib/reports/publicationApi";
import { candidateLabel, publishErrorMessage, publishState, versionLabel } from "@/lib/reports/publicationRules";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";
import type { PublicationRead, PublishedReportListItem, ReportSummary } from "@/types/reports";

type Choices = { current: PublishedReportListItem | null; candidates: ReportSummary[] };

/** Versi terbit laporan ini, dan laporan tersimpan bernilai Test yang boleh menggantikannya (AC12). */
async function loadChoices(
  reportId: string,
  gateway: PublicationGateway,
  reportsGateway: ReportsGateway,
): Promise<Choices> {
  const [published, reports] = await Promise.all([gateway.listPublished(), reportsGateway.list()]);
  return {
    current: published.find((item) => item.report_id === reportId) ?? null,
    candidates: reports.filter((report) => publishState(report) === "ready"),
  };
}

/**
 * Tombol Ganti versi di laporan yang sedang terbit (PBI-17 AC9). Server butuh laporan tersimpan sebagai versi
 * pengganti, jadi Admin memilih satu laporan tersimpan bernilai Test; laporan itu terbit sebagai versi berikutnya
 * dan laporan ini menjadi Digantikan, tetap tersimpan dan bisa dibuka.
 */
export function ReplaceVersionDialog({
  report,
  gateway = httpPublicationGateway,
  reportsGateway = httpReportsGateway,
  onReplaced,
  onClose,
}: Readonly<{
  report: { id: string; title: string };
  gateway?: PublicationGateway;
  reportsGateway?: ReportsGateway;
  onReplaced: (publication: PublicationRead) => void;
  onClose: (afterError: boolean) => void;
}>) {
  const selectId = useId();
  const [replacement, setReplacement] = useState("");
  const choices = useAsyncResource<Choices>(
    `replace|${report.id}`,
    () => loadChoices(report.id, gateway, reportsGateway),
    () => "Gagal memuat pilihan laporan. Coba lagi.",
  );
  const current = choices.status === "ready" ? choices.data.current : null;

  return (
    <ConfirmDialog
      title="Ganti versi laporan?"
      confirmLabel="Ganti versi"
      busyLabel="Mengganti…"
      confirmDisabled={current === null || replacement === ""}
      onConfirm={() => gateway.publish(replacement, current?.id)}
      errorMessage={publishErrorMessage}
      onDone={onReplaced}
      onClose={onClose}
    >
      {current && (
        <p className="mt-2 text-sm text-slate-600">
          “{report.title}” ({versionLabel(current.version_no)}) diganti oleh laporan yang Anda pilih, yang terbit sebagai
          versi berikutnya.
        </p>
      )}
      <p className="mt-2 text-sm text-slate-600">Versi lama tetap tersimpan dan masih bisa dibuka, tetapi tidak lagi ada di daftar terbit.</p>
      <div className="mt-3 text-sm">
        {choices.status === "loading" && <p className="text-slate-500">Memuat pilihan laporan…</p>}
        {choices.status === "error" && <ErrorState message={choices.message} onRetry={choices.reload} />}
        {choices.status === "ready" && current === null && (
          <p className="text-slate-600">Laporan ini sudah tidak sedang terbit. Tutup dialog lalu muat ulang halaman.</p>
        )}
        {choices.status === "ready" && current !== null && choices.data.candidates.length === 0 && (
          <p className="text-slate-600">
            Belum ada laporan tersimpan dengan nilai Test yang bisa menggantikannya. Buat laporan baru dulu.
          </p>
        )}
        {choices.status === "ready" && current !== null && choices.data.candidates.length > 0 && (
          <>
            <label htmlFor={selectId} className="block font-medium text-slate-900">
              Laporan pengganti
            </label>
            <select
              id={selectId}
              value={replacement}
              onChange={(event) => setReplacement(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="">Pilih laporan…</option>
              {choices.data.candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidateLabel(candidate)}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </ConfirmDialog>
  );
}
