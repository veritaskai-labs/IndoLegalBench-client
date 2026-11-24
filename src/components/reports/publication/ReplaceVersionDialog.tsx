"use client";

import { useId, useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { ApiError } from "@/lib/apiClient";
import { httpPublicationGateway, type PublicationGateway } from "@/lib/reports/publicationApi";
import {
  REPORT_NOT_PUBLISHABLE,
  publishErrorMessage,
  replaceCandidateLabel,
  replaceCandidatesErrorMessage,
} from "@/lib/reports/publicationRules";
import type { PublicationRead, ReplaceCandidate } from "@/types/reports";

/** replaces = versi terbit laporan ini (supersedes_id); null bila laporan ini sudah tidak sedang terbit. */
type Choices = { replaces: string | null; candidates: ReplaceCandidate[] };

const NOT_CURRENT: Choices = { replaces: null, candidates: [] };

/**
 * Laporan tersimpan bernilai Test dengan produk yang sama yang boleh menggantikan laporan ini (SCRUM-371). Halaman
 * bisa tertinggal: laporan yang sudah digantikan dijawab 409 REPORT_NOT_PUBLISHABLE, dan laporan yang ternyata
 * masih tersimpan dijawab mode replace_published. Keduanya berarti laporan ini tidak sedang terbit.
 */
async function loadChoices(reportId: string, gateway: PublicationGateway): Promise<Choices> {
  try {
    const found = await gateway.replaceCandidates(reportId);
    if (found.mode !== "replace_with_saved" || found.replaces_publication_id == null) return NOT_CURRENT;
    return { replaces: found.replaces_publication_id, candidates: found.items };
  } catch (error) {
    if (error instanceof ApiError && error.code === REPORT_NOT_PUBLISHABLE) return NOT_CURRENT;
    throw error;
  }
}

/**
 * Tombol Ganti versi di laporan yang sedang terbit (PBI-17 AC9). Server butuh laporan tersimpan sebagai versi
 * pengganti, jadi Admin memilih satu laporan tersimpan bernilai Test; laporan itu terbit sebagai versi berikutnya
 * dan laporan ini menjadi Digantikan, tetap tersimpan dan bisa dibuka.
 *
 * SCRUM-373 (feedback UAT sprint 4): pilihannya hanya laporan yang membandingkan produk yang sama, disaring server
 * menurut product_id (SCRUM-371), karena label beku di mode kode tidak menunjukkan produk yang sebenarnya.
 */
export function ReplaceVersionDialog({
  report,
  gateway = httpPublicationGateway,
  onReplaced,
  onClose,
}: Readonly<{
  report: { id: string; title: string };
  gateway?: PublicationGateway;
  onReplaced: (publication: PublicationRead) => void;
  onClose: (afterError: boolean) => void;
}>) {
  const selectId = useId();
  const [replacement, setReplacement] = useState("");
  const choices = useAsyncResource<Choices>(
    `replace|${report.id}`,
    () => loadChoices(report.id, gateway),
    replaceCandidatesErrorMessage,
  );
  const replaces = choices.status === "ready" ? choices.data.replaces : null;

  return (
    <ConfirmDialog
      title="Ganti versi laporan?"
      confirmLabel="Ganti versi"
      busyLabel="Mengganti…"
      confirmDisabled={replaces === null || replacement === ""}
      onConfirm={() => gateway.publish(replacement, replaces ?? undefined)}
      errorMessage={publishErrorMessage}
      onDone={onReplaced}
      onClose={onClose}
    >
      <p className="mt-2 text-sm text-slate-600">
        “{report.title}” diganti oleh laporan yang Anda pilih, yang terbit sebagai versi berikutnya. Hanya laporan yang
        membandingkan produk yang sama yang bisa dipilih.
      </p>
      <p className="mt-2 text-sm text-slate-600">Versi lama tetap tersimpan dan masih bisa dibuka, tetapi tidak lagi ada di daftar terbit.</p>
      <div className="mt-3 text-sm">
        {choices.status === "loading" && <p className="text-slate-500">Memuat laporan dengan produk yang sama…</p>}
        {choices.status === "error" && <ErrorState message={choices.message} onRetry={choices.reload} />}
        {choices.status === "ready" && replaces === null && (
          <p className="text-slate-600">Laporan ini sudah tidak sedang terbit. Tutup dialog lalu muat ulang halaman.</p>
        )}
        {choices.status === "ready" && replaces !== null && choices.data.candidates.length === 0 && (
          <p className="text-slate-600">
            Belum ada laporan tersimpan bernilai Test yang membandingkan produk yang sama. Buat laporan baru dengan
            produk yang sama dulu.
          </p>
        )}
        {choices.status === "ready" && replaces !== null && choices.data.candidates.length > 0 && (
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
                <option key={candidate.report_id} value={candidate.report_id}>
                  {replaceCandidateLabel(candidate)}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
    </ConfirmDialog>
  );
}
