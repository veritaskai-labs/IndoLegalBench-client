"use client";

import { useCallback, useId } from "react";
import { CaseSectionList } from "@/components/cases/CaseSectionList";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { SplitTagBadge } from "@/components/cases/SplitTagBadge";
import { openAsModal } from "@/components/ui/ConfirmDialog";
import { ErrorState, LoadingState } from "@/components/ui";
import { useCaseDetail } from "@/hooks/useCaseDetail";
import type { CaseDirectoryRow } from "@/lib/cases/caseDirectory";
import { CHROME } from "@/lib/i18n/chrome";
import { fill, messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";

const COPY = messages({
  id: {
    title: "Pratinjau kasus",
    closePreview: "Tutup pratinjau",
    loading: "Memuat pratinjau…",
    notFound: "Kasus tidak ditemukan.",
    failed: "Gagal memuat pratinjau kasus.",
    version: "Versi {number}",
    untitled: "Kasus tanpa judul",
    duplicate: "Duplikat",
  },
  en: {
    title: "Case preview",
    closePreview: "Close preview",
    loading: "Loading preview…",
    notFound: "The case was not found.",
    failed: "Could not load the case preview.",
    version: "Version {number}",
    untitled: "Untitled case",
    duplicate: "Duplicate",
  },
});

const HEADER_SECTIONS = ["identity.title", "case_code", "split_tag"];

export function CasePreviewDrawer({ row, onClose, onDuplicate }: Readonly<{
  row: CaseDirectoryRow;
  onClose: () => void;
  onDuplicate?: () => void;
}>) {
  const copy = useText(COPY);
  const chrome = useText(CHROME);
  const headingId = useId();
  const detail = useCaseDetail(row.id);
  const attach = useCallback((node: HTMLDialogElement) => {
    const opener = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    openAsModal(node);
    node.querySelector("button")?.focus();
    return () => {
      if (node.open && typeof node.close === "function") node.close();
      document.body.style.overflow = overflow;
      if (opener instanceof HTMLElement) opener.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={attach}
      aria-labelledby={headingId}
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      className="fixed inset-y-0 right-0 m-0 ml-auto h-dvh max-h-dvh w-full max-w-none flex-col overflow-hidden border-l border-slate-200 bg-white p-0 text-slate-900 shadow-xl open:flex sm:max-w-2xl backdrop:bg-slate-900/25"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
        <h2 id={headingId} className="text-lg font-semibold">{copy.title}</h2>
        <button type="button" aria-label={copy.closePreview} onClick={onClose}
          className="flex size-10 items-center justify-center rounded-md text-xl text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-indigo-600"
        >
          <span aria-hidden="true">×</span>
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5">
        {detail.status === "loading" && <LoadingState label={copy.loading} />}
        {detail.status === "error" && (
          <ErrorState
            message={detail.notFound ? copy.notFound : copy.failed}
            onRetry={detail.notFound || detail.hidden ? undefined : detail.reload}
          />
        )}
        {detail.status === "ready" && (
          <article className="space-y-4 [overflow-wrap:anywhere]">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs text-slate-600">{detail.saved.case_code}</span>
                <span className="text-xs text-slate-600">{fill(copy.version, { number: detail.saved.version })}</span>
                <CaseStatusBadge status={detail.saved.status} />
                <SplitTagBadge tag={detail.saved.split_tag} wasDev={detail.saved.was_dev} />
              </div>
              <h3 className="text-xl font-semibold">{detail.saved.identity.title || copy.untitled}</h3>
              <p className="text-sm text-slate-600">{row.suite_name}</p>
            </div>
            <CaseSectionList omit={HEADER_SECTIONS} sections={{
              "identity.title": detail.saved.identity.title,
              "identity.question": detail.saved.identity.question,
              category: detail.saved.identity.category,
              case_code: detail.saved.case_code,
              split_tag: detail.saved.split_tag,
              legal_refs: detail.saved.legal_refs,
              answer_criteria: detail.saved.answer_criteria,
            }} />
          </article>
        )}
      </div>
      <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-200 p-4">
        <button type="button" onClick={onClose} className="rounded-md border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-50">
          {chrome.close}
        </button>
        {onDuplicate && detail.status === "ready" && (
          <button type="button" onClick={onDuplicate} className="rounded-md bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700">
            {copy.duplicate}
          </button>
        )}
      </footer>
    </dialog>
  );
}
