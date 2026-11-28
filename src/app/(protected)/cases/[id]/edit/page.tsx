"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CaseEditorForm } from "@/components/cases/CaseEditorForm";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { ChangeSplitTagDialog } from "@/components/cases/ChangeSplitTagDialog";
import { SplitTagBadge } from "@/components/cases/SplitTagBadge";
import { CompletenessIndicator } from "@/components/cases/CompletenessIndicator";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import {
  CaseTabs,
  panelId,
  tabId,
  type CaseTab,
} from "@/components/cases/CaseTabs";
import { LockedVersionNotice } from "@/components/cases/LockedVersionNotice";
import { SubmitReviewButton } from "@/components/cases/SubmitReviewButton";
import { VersionHistoryTab } from "@/components/cases/VersionHistoryTab";
import { ReviewerFeedbackGate } from "@/components/reviews/ReviewerFeedbackGate";
import { useAuth } from "@/hooks/useAuth";
import { isDeveloperAiSession } from "@/lib/auth";
import { useCaseCompleteness } from "@/hooks/useCaseCompleteness";
import { useCanStartNewVersion } from "@/hooks/useCanStartNewVersion";
import { useCanSubmitForReview } from "@/hooks/useCanSubmitForReview";
import { useCaseDetail } from "@/hooks/useCaseDetail";
import { useOpenDraft } from "@/hooks/useOpenDraft";
import { mapSaveError, type FieldSaveError } from "@/lib/cases/saveError";
import { messages } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { useStartNewVersion } from "@/hooks/useStartNewVersion";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { updateCase } from "@/lib/cases/caseApi";
import {
  fromCaseRead,
  type CaseWritePayload,
} from "@/lib/cases/caseFormMapping";
import { isCaseEditable } from "@/lib/cases/permissions";
import { canChangeTagAsAdmin, isTagLockedInEditor } from "@/lib/cases/splitTag";
import type { CaseRead } from "@/types/case";
import { caseReadPath } from "@/lib/cases/casePaths";
import { decodeRouteParam } from "@/lib/routeParams";
import { Breadcrumb } from "@/components/ui";
import { useSuiteName } from "@/hooks/useSuiteName";
import Link from "next/link";

const COPY = messages({
  id: {
    loading: "Memuat kasus…",
    notFound: "Kasus tidak ditemukan.",
    backToSuites: "Kembali ke Suites",
    loadFailed: "Gagal memuat kasus.",
    leave: "Ada perubahan yang belum disimpan. Tinggalkan halaman ini?",
    tagChanged: "Tag kasus diubah",
    saved: "Perubahan tersimpan",
    crumb: "Suite dan kasus",
    back: "Kembali ke suite",
    unsaved: "Ada perubahan yang belum disimpan",
    changeTag: "Ubah tag",
    saveBeforeTag: "Simpan perubahan dulu untuk mengubah tag",
    versionStarted: "Versi baru dibuat. Perubahan akan ditinjau ulang sebelum berlaku",
    submitted: "Kasus diajukan untuk direview",
  },
  en: {
    loading: "Loading case…",
    notFound: "The case was not found.",
    backToSuites: "Back to suites",
    loadFailed: "Could not load the case.",
    leave: "There are unsaved changes. Leave this page?",
    tagChanged: "Case tag changed",
    saved: "Changes saved",
    crumb: "Suites and cases",
    back: "Back to the suite",
    unsaved: "There are unsaved changes",
    changeTag: "Change tag",
    saveBeforeTag: "Save your changes before changing the tag",
    versionStarted: "New version started. Changes will be reviewed again before they take effect",
    submitted: "Case submitted for review",
  },
});

export default function EditCasePage() {
  const caseId = decodeRouteParam(useParams<{ id: string }>().id);
  const auth = useAuth();
  const router = useRouter();
  // Developer AI hanya membaca: editor memanggil kelengkapan, versi, dan draf yang dijawab 403,
  // jadi peran ini dipindah ke halaman baca sebelum editor memuat apa pun (SCRUM-184).
  const isDeveloperAi = isDeveloperAiSession(auth);

  useEffect(() => {
    if (isDeveloperAi) router.replace(caseReadPath(caseId));
  }, [isDeveloperAi, caseId, router]);

  const copy = useText(COPY);
  if (isDeveloperAi) return <LoadingState label={copy.loading} />;
  return <CaseEditor caseId={caseId} />;
}

function CaseEditor({ caseId }: Readonly<{ caseId: string }>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const detail = useCaseDetail(caseId);
  const { showToast } = useToast();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<CaseTab>("editor");
  const [changingTag, setChangingTag] = useState(false);
  // Kunci baru me-remount form dengan data tersimpan, jadi status dirty ikut bersih.
  const [formKey, setFormKey] = useState(0);
  // formKey naik tiap simpan berhasil, jadi kelengkapan ikut dihitung ulang server.
  const completeness = useCaseCompleteness(caseId, formKey);
  const router = useRouter();
  const auth = useAuth();
  const user = auth.status === "authenticated" ? auth.user : null;
  const canStart = useCanStartNewVersion(
    caseId,
    user,
    detail.status === "ready" ? detail.saved.status : null,
  );
  // Server hanya menerima pengajuan dari penulis kasus; tombol mengikuti aturan yang sama.
  const canSubmit = useCanSubmitForReview(
    caseId,
    user,
    detail.status === "ready" ? detail.saved.status : null,
  );
  // GET masih mengembalikan versi yang disetujui walau draf sudah ada, jadi draf dicari lewat
  // endpoint sendiri. Hanya untuk yang boleh membuat versi baru: server menjawab 403 untuk yang lain.
  const openDraft = useOpenDraft(caseId, canStart, (draft: CaseRead) => {
    detail.replace(draft);
    setFormKey((key) => key + 1);
  });
  // Tombol baru muncul setelah pencarian selesai tanpa draf, kalau tidak klik akan dijawab 409.
  const canOfferStart = canStart && openDraft.status === "ready";
  // Form diisi dari draf hasil POST, bukan GET: GET masih mengembalikan versi yang disetujui.
  const startVersion = useStartNewVersion(caseId, (draft: CaseRead) => {
    detail.replace(draft);
    setFormKey((key) => key + 1);
    showToast(copy.versionStarted);
  });
  const suiteName = useSuiteName(
    detail.status === "ready" ? detail.saved.suite_id : null,
  );

  useUnsavedChangesWarning(dirty);

  if (detail.status === "loading")
    return <LoadingState label={copy.loading} />;

  if (detail.status === "error") {
    return detail.notFound ? (
      <div className="space-y-4">
        <ErrorState variant="card" message={copy.notFound} />
        <Link
          href="/suites"
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          {copy.backToSuites}
        </Link>
      </div>
    ) : (
      <ErrorState
        variant="card"
        message={copy.loadFailed}
        onRetry={detail.reload}
      />
    );
  }
  const { saved } = detail;
  const editable = isCaseEditable(saved.status);
  const canChangeTag = saved.split_tag !== null && canChangeTagAsAdmin(user?.role ?? null, saved);
  
  const suitePath = `/suites/${encodeURIComponent(saved.suite_id)}`;

  function leaveTo(path: string) {
    if (
      dirty &&
      !confirm(copy.leave)
    ) {
      return;
    }
    router.push(path);
  }

  function handleTagChanged(result: CaseRead) {
    setChangingTag(false);
    // PATCH mengembalikan versi yang berlaku. Kalau yang terbuka draf berikutnya, draf itu tetap
    // ditampilkan dan hanya tagnya yang diganti, karena server mengubah tag keduanya.
    detail.replace({ ...saved, split_tag: result.split_tag, was_dev: result.was_dev });
    setFormKey((key) => key + 1);
    showToast(copy.tagChanged);
  }

  async function handleSubmit(payload: CaseWritePayload): Promise<FieldSaveError | null> {
    setSaveMessage(null);
    try {
      detail.replace(await updateCase(caseId, payload));
      setFormKey((key) => key + 1);
      showToast(copy.saved);
      return null;
    } catch (error) {
      const mapped = mapSaveError(error, locale);
      if (mapped.kind === "field") return mapped;
      setSaveMessage(mapped.message);
      return null;
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-2">
        <Breadcrumb
          items={[
            { label: copy.crumb, onClick: () => leaveTo("/suites") },
            { label: suiteName, onClick: () => leaveTo(suitePath) },
            { label: saved.case_code },
          ]}
        />
      </div>

      <button
        type="button"
        onClick={() => leaveTo(suitePath)}
        aria-label={copy.back}
        className="sticky top-20 z-10 float-left mr-2.5 mt-1 inline-flex size-8 cursor-pointer items-center justify-center rounded-control border border-line bg-paper/90 text-ink-soft shadow-xs backdrop-blur-xs transition-colors hover:bg-surface hover:text-ink"
      >
        <svg
          aria-hidden="true"
          width={18}
          height={18}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="font-serif text-4xl leading-10 text-ink">{saved.case_code}</h1>
            <CaseStatusBadge status={saved.status} />
            <SplitTagBadge tag={saved.split_tag} wasDev={saved.was_dev} />
          </div>
          {dirty && (
            <p className="text-xs font-medium text-warning-ink">{copy.unsaved}</p>
          )}
        </div>
        {canChangeTag && (
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => setChangingTag(true)}
              // Form dimuat ulang setelah tag berubah, jadi perubahan yang belum disimpan akan hilang.
              disabled={dirty}
              className="inline-flex items-center gap-2 rounded-control bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M13.6 2.6a2 2 0 0 1 2.8 2.8l-8.5 8.5-3.6.8.8-3.6 8.5-8.5Z" />
                <path d="M3 17h14v1.5H3z" />
              </svg>
              {copy.changeTag}
            </button>
            {dirty && (
              <p className="text-[11px] text-muted">{copy.saveBeforeTag}</p>
            )}
          </div>
        )}
      </header>

      <div className="clear-left mt-6 space-y-6">
        <CaseTabs active={tab} onChange={setTab} />

      {/* Editor tetap terpasang saat tab riwayat dibuka, supaya perubahan yang belum disimpan tidak hilang. */}
      <div
        role="tabpanel"
        id={panelId("editor")}
        aria-labelledby={tabId("editor")}
        hidden={tab !== "editor"}
        className="space-y-6"
      >
        <ReviewerFeedbackGate caseId={caseId} user={user} status={saved.status} />

        <CompletenessIndicator
          {...completeness}
          submittable={editable}
          onRetry={completeness.reload}
        />

        {saveMessage !== null && (
          <ErrorState message={saveMessage} />
        )}

        {openDraft.status === "error" && (
          <ErrorState message={openDraft.message} onRetry={openDraft.reload} />
        )}

        {!editable && (
          <LockedVersionNotice
            approved={saved.status === "approved"}
            canStart={canOfferStart}
            pending={startVersion.pending}
            error={startVersion.error}
            onStart={startVersion.start}
          />
        )}

        <CaseEditorForm
          key={formKey}
          defaultValues={fromCaseRead(saved)}
          caseId={caseId}
          onSubmit={handleSubmit}
          onDirtyChange={setDirty}
          readOnly={!editable}
          tagLocked={isTagLockedInEditor(saved)}
          actions={
            canSubmit && completeness.status === "ready" ? (
              <SubmitReviewButton
                caseId={caseId}
                ready={completeness.completeness.ready_for_review}
                dirty={dirty}
                onStale={() => {
                  // Diajukan dari tempat lain: baca ulang supaya status dan kunci editor ikut benar.
                  detail.reload();
                }}
                onSubmitted={(result) => {
                  // Status diambil dari balasan server, bukan ditebak.
                  detail.replace({ ...saved, status: result.status });
                  setFormKey((key) => key + 1);
                  showToast(copy.submitted);
                }}
              />
            ) : null
          }
        />
      </div>

      {changingTag && saved.split_tag !== null && (
        <ChangeSplitTagDialog
          caseId={caseId}
          caseCode={saved.case_code}
          current={saved.split_tag}
          onClose={() => setChangingTag(false)}
          onDone={handleTagChanged}
        />
      )}

      {tab === "history" && (
        <div
          role="tabpanel"
          id={panelId("history")}
          aria-labelledby={tabId("history")}
        >
          <VersionHistoryTab key={caseId} caseId={caseId} />
        </div>
      )}
      </div>
    </div>
  );
}
