"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useManualEvidence } from "@/hooks/useManualEvidence";
import { useRetainedResource } from "@/hooks/useRetainedResource";
import { answerErrorMessage, type ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import {
  EVIDENCE_LIMIT_MESSAGE,
  MAX_EVIDENCE_PER_ANSWER,
  canAddEvidence,
  formatFileSize,
  safeEvidenceHref,
} from "@/lib/runs/manualEvidenceRules";
import type { EvidenceRead } from "@/types/measurement";

type Props = Readonly<{
  gateway: ManualAnswerGateway;
  sessionId: string;
  snapshotItemId: string;
  attemptNo: number;
  /** null: peran ini tidak boleh melihat bukti (MANUAL_EVIDENCE_VISIBILITY di server). */
  evidenceCount: number | null;
  slotFilled: boolean;
  canEdit: boolean;
}>;

const BUTTON = "rounded-md border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50";
const ACCEPT = "image/png,image/jpeg,application/pdf";

/** Isi satu bukti: berkas dengan tombol Unduh, tautan yang aman, atau teks bila tautannya tidak aman. */
function EvidenceLabel({
  item,
  busy,
  onDownload,
}: Readonly<{ item: EvidenceRead; busy: boolean; onDownload: () => void }>) {
  if (item.kind === "file") {
    return (
      <div className="flex items-center gap-2">
        <span className="font-medium text-slate-900">{item.file_name}</span>
        <span className="text-xs text-slate-500">{formatFileSize(item.size_bytes)}</span>
        <button type="button" className={BUTTON} disabled={busy} onClick={onDownload} aria-label={`Unduh ${item.file_name}`}>
          Unduh
        </button>
      </div>
    );
  }
  const href = safeEvidenceHref(item.url);
  if (href === null) return <span className="break-all text-slate-700">{item.url}</span>;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className="break-all text-blue-700 underline">
      {href}
    </a>
  );
}

function EvidenceItem({
  item,
  position,
  canEdit,
  busy,
  onDownload,
  onDelete,
}: Readonly<{
  item: EvidenceRead;
  position: number;
  canEdit: boolean;
  busy: boolean;
  onDownload: () => void;
  onDelete: () => void;
}>) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
      <EvidenceLabel item={item} busy={busy} onDownload={onDownload} />
      {canEdit && (
        <button type="button" className={BUTTON} disabled={busy} onClick={onDelete} aria-label={`Hapus bukti ${position}`}>
          Hapus
        </button>
      )}
    </li>
  );
}

function EvidenceList({
  gateway,
  sessionId,
  snapshotItemId,
  attemptNo,
  canEdit,
}: Readonly<Omit<Props, "evidenceCount" | "slotFilled">>) {
  const evidence = useManualEvidence(gateway, sessionId, snapshotItemId, attemptNo);
  const [linkText, setLinkText] = useState("");
  const [pendingDelete, setPendingDelete] = useState<EvidenceRead | null>(null);
  // Data lama tetap tampil saat daftar dimuat ulang, supaya kolom tautan tidak terlepas.
  const list = useRetainedResource(evidence.list);

  if (list.status === "loading") return <LoadingState label="Memuat bukti…" />;
  if (list.status === "error") return <ErrorState variant="card" message={list.message} onRetry={list.reload} />;

  const items = list.data;
  const canAdd = canAddEvidence(items.length);

  async function addLink() {
    if (await evidence.add({ kind: "link", url: linkText })) setLinkText("");
  }

  return (
    <div className="space-y-3">
      <h5 className="text-sm font-semibold text-slate-900">
        Bukti ({items.length} dari {MAX_EVIDENCE_PER_ANSWER})
      </h5>
      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, index) => (
            <EvidenceItem
              key={item.id}
              item={item}
              position={index + 1}
              canEdit={canEdit}
              busy={evidence.busy}
              onDownload={() => void evidence.download(item)}
              onDelete={() => setPendingDelete(item)}
            />
          ))}
        </ul>
      )}

      {canEdit && (
        <div className="space-y-2">
          {!canAdd && <p className="text-xs text-slate-600">{EVIDENCE_LIMIT_MESSAGE}</p>}
          <label className="block text-xs font-medium text-slate-600">
            <span>Unggah berkas bukti</span>
            <input
              type="file"
              accept={ACCEPT}
              disabled={!canAdd || evidence.busy}
              className="mt-1 block text-sm"
              onChange={(event) => {
                const chosen = event.target.files?.[0];
                event.target.value = "";
                if (chosen) void evidence.add({ kind: "file", file: chosen });
              }}
            />
          </label>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block text-xs font-medium text-slate-600">
              <span>Tautan bukti</span>
              <input
                type="url"
                value={linkText}
                disabled={!canAdd || evidence.busy}
                onChange={(event) => setLinkText(event.target.value)}
                className="mt-1 block w-72 max-w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              />
            </label>
            <button type="button" className={BUTTON} disabled={!canAdd || evidence.busy} onClick={() => void addLink()}>
              Tambah tautan
            </button>
          </div>
        </div>
      )}

      {evidence.error && (
        <p role="alert" className="text-sm text-red-700">
          {evidence.error}
        </p>
      )}

      {pendingDelete && (
        <ConfirmDialog
          title="Hapus bukti ini?"
          confirmLabel="Hapus bukti"
          busyLabel="Menghapus…"
          onConfirm={() => evidence.remove(pendingDelete.id)}
          errorMessage={answerErrorMessage}
          onDone={() => setPendingDelete(null)}
          onClose={() => setPendingDelete(null)}
        >
          <p className="mt-2 text-sm text-slate-700">Berkas atau tautan ini dihapus dari jawaban dan tidak bisa dikembalikan.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

/**
 * Bukti opsional satu jawaban (AC7): maksimal 3 berkas PNG/JPG/PDF atau tautan. Bukti menempel pada
 * jawaban yang sudah tersimpan, jadi slot kosong hanya menjelaskan itu. Peran yang tidak boleh
 * melihat bukti (evidence_count null) tidak melihat apa pun dan tidak memicu pemuatan.
 */
export function EvidencePanel({ evidenceCount, slotFilled, canEdit, ...rest }: Props) {
  if (evidenceCount === null) return null;
  if (!slotFilled) {
    return canEdit ? <p className="text-xs text-slate-500">Simpan jawaban terlebih dahulu untuk menambah bukti.</p> : null;
  }
  return (
    <section aria-label="Bukti jawaban" className="space-y-3 border-t border-slate-100 pt-3">
      <EvidenceList {...rest} canEdit={canEdit} />
    </section>
  );
}
