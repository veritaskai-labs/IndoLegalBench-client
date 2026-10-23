"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { auditActionLabel } from "@/lib/audit/actionLabels";
import { actorIdentity } from "@/lib/audit/actorLabel";
import { entityLabel } from "@/lib/audit/entityLabels";
import { formatWib } from "@/lib/audit/formatWib";
import type { AuditEntry } from "@/types/audit";

type Props = {
  entry: AuditEntry;
  onClose: () => void;
};

function ValueBlock({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  return (
    <div>
      <p className="text-xs font-medium text-slate-700">{label}</p>
      <pre className="mt-1 overflow-x-auto rounded-md bg-slate-50 p-3 text-xs text-slate-700">
        {value === null ? "Tidak ada" : JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}

const FOCUSABLE = 'a[href], button:not([disabled]):not([tabindex="-1"])';

/** Tab dan Shift+Tab berputar di dalam dialog; fokus yang lepas ditarik kembali. */
function containTab(event: KeyboardEvent, root: HTMLElement) {
  const focusable = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE));
  if (focusable.length === 0) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  const active = document.activeElement;
  const outside = !(active instanceof HTMLElement) || !root.contains(active);

  if (event.shiftKey && (outside || active === first)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (outside || active === last)) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * Perilaku modal untuk keyboard: fokus awal di tombol tutup, halaman di
 * belakang dibuat inert, Tab tidak keluar dari dialog, Escape menutup, dan
 * fokus kembali ke elemen yang membukanya.
 */
function useDialogKeyboard(
  onClose: () => void,
  closeButton: React.RefObject<HTMLElement | null>,
  root: React.RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const opener = document.activeElement;
    const dialogRoot = root.current;
    const inerted = Array.from(document.body.children).filter(
      (el) => el !== dialogRoot && !el.hasAttribute("inert"),
    );
    inerted.forEach((el) => el.setAttribute("inert", ""));
    closeButton.current?.focus();
    return () => {
      inerted.forEach((el) => el.removeAttribute("inert"));
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, [closeButton, root]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      else if (event.key === "Tab" && root.current) containTab(event, root.current);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, root]);
}

/**
 * Detail satu catatan audit, tampil sebagai pop-up supaya tidak terlewat di
 * bawah tabel. Hanya menerima satu catatan, tidak tahu daftarnya.
 */
export function AuditDetailPanel({ entry, onClose }: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);
  const root = useRef<HTMLDivElement>(null);
  useDialogKeyboard(onClose, closeButton, root);
  const { primary, secondary } = actorIdentity(entry);

  return createPortal(
    <div ref={root} className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        data-testid="audit-detail-backdrop"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-slate-900/40"
      />
      <dialog
        open
        aria-modal="true"
        aria-label="Detail catatan audit"
        className="relative m-0 max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-6 text-slate-900 shadow-lg"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {auditActionLabel(entry.action)}
            </h2>
            <p className="mt-1 font-mono text-xs text-slate-500">{entry.action}</p>
            <p className="mt-1 text-xs text-slate-500">
              {formatWib(entry.occurred_at)} · {primary}
              {secondary && ` (${secondary})`} ·{" "}
              {entry.entity_label && `${entityLabel(entry.entity_type)} ${entry.entity_label} · `}
              {entry.entity_id}
            </p>
          </div>
          <button
            ref={closeButton}
            type="button"
            onClick={onClose}
            className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Tutup
          </button>
        </div>

        {entry.action === "review.comment_replied" && entry.entity_type === "review" && (
          <Link href={`/reviews/${encodeURIComponent(entry.entity_id)}/discussion`} target="_blank" rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-indigo-600 underline">
            Buka diskusi komentar
          </Link>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ValueBlock label="Sebelum" value={entry.before} />
          <ValueBlock label="Sesudah" value={entry.after} />
        </div>

        <div className="mt-4">
          <p className="text-xs font-medium text-slate-700">Alasan</p>
          <p className="mt-1 text-sm text-slate-600">{entry.reason ?? "Tanpa alasan"}</p>
        </div>
      </dialog>
    </div>,
    document.body,
  );
}