"use client";

import { useId, useState } from "react";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { type AsyncResource, useAsyncResource } from "@/hooks/useAsyncResource";
import { httpPublicationGateway, type PublicationGateway } from "@/lib/reports/publicationApi";
import { publishErrorMessage, replaceCandidateLabel, replaceCandidatesErrorMessage } from "@/lib/reports/publicationRules";
import type { PublicationRead, ReplaceCandidate, ReplaceCandidates } from "@/types/reports";

type Mode = "new" | "replace";

/** Kenapa opsi Ganti versi belum bisa dipilih; null berarti bisa dipilih (SCRUM-373). */
function replaceBlockedReason(replaceable: AsyncResource<ReplaceCandidates>): string | null {
  if (replaceable.status === "loading") return "Memuat versi terbit dengan produk yang sama…";
  if (replaceable.status === "error") return replaceable.message;
  if (replaceable.data.items.length === 0) return "Belum ada laporan terbit yang membandingkan produk yang sama.";
  return null;
}

/**
 * Konfirmasi Terbitkan (PBI-17 AC9). Admin memilih menerbitkan sebagai laporan baru, atau mengganti satu versi
 * yang sedang terbit; versi lama tetap tersimpan (server menandainya superseded). Penerbitan hanya menaruh laporan
 * di daftar Laporan terbit untuk pengguna yang login: tanpa tautan publik, jadwal, atau notifikasi.
 *
 * SCRUM-373 (feedback UAT sprint 4): versi yang bisa diganti hanya yang membandingkan produk yang sama, supaya
 * laporan A vs B tidak menggantikan laporan C vs D. Daftarnya dimuat saat dialog dibuka, karena opsi Ganti versi
 * harus nonaktif beserta alasannya bila tidak ada kandidat.
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
  const reasonId = useId();
  const replaceable = useAsyncResource<ReplaceCandidates>(
    `replace-candidates|${report.id}`,
    () => gateway.replaceCandidates(report.id),
    replaceCandidatesErrorMessage,
  );
  const blocked = replaceBlockedReason(replaceable);

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
          <input
            type="radio"
            name={name}
            checked={mode === "replace"}
            disabled={blocked !== null}
            aria-describedby={blocked === null ? undefined : reasonId}
            onChange={() => setMode("replace")}
          />
          <span className={blocked === null ? undefined : "text-slate-500"}>Ganti versi yang sedang terbit</span>
        </label>
        {blocked !== null && (
          <div id={reasonId} className="ml-6">
            {replaceable.status === "error" ? (
              <ErrorState message={blocked} onRetry={replaceable.reload} />
            ) : (
              <p className="text-slate-600">{blocked}</p>
            )}
          </div>
        )}
      </fieldset>
      {mode === "replace" && replaceable.status === "ready" && (
        <ReplaceChoice candidates={replaceable.data.items} value={replaced} onChange={setReplaced} />
      )}
    </ConfirmDialog>
  );
}

/**
 * Pilihan versi terbit; server sudah menyaringnya ke produk yang sama (SCRUM-371, mode replace_published), dan
 * publication_id tiap pilihan dikirim sebagai supersedes_id.
 */
function ReplaceChoice({
  candidates,
  value,
  onChange,
}: Readonly<{ candidates: ReplaceCandidate[]; value: string; onChange: (publicationId: string) => void }>) {
  const selectId = useId();

  return (
    <div className="mt-3 text-sm">
      <p className="text-slate-600">Versi lama tetap tersimpan dan masih bisa dibuka, tetapi tidak lagi ada di daftar terbit.</p>
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
        {candidates.map((candidate) => (
          <option key={candidate.report_id} value={candidate.publication_id ?? ""}>
            {replaceCandidateLabel(candidate)}
          </option>
        ))}
      </select>
    </div>
  );
}
