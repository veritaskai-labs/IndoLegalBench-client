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
import { useSaveErrorBanner } from "@/hooks/useSaveErrorBanner";
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
import type { FieldSaveError } from "@/lib/cases/saveError";
import { caseReadPath } from "@/lib/cases/casePaths";
import { decodeRouteParam } from "@/lib/routeParams";
import { Breadcrumb } from "@/components/ui";
import { useSuiteName } from "@/hooks/useSuiteName";
import Link from "next/link";

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

  if (isDeveloperAi) return <LoadingState label="Memuat kasus…" />;
  return <CaseEditor caseId={caseId} />;
}

function CaseEditor({ caseId }: Readonly<{ caseId: string }>) {
  const detail = useCaseDetail(caseId);
  const { showToast } = useToast();
  const saveError = useSaveErrorBanner();
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
    showToast(
      "Versi baru dibuat. Perubahan akan ditinjau ulang sebelum berlaku",
    );
  });
  const suiteName = useSuiteName(
    detail.status === "ready" ? detail.saved.suite_id : null,
  );

  useUnsavedChangesWarning(dirty);

  if (detail.status === "loading")
    return <LoadingState label="Memuat kasus…" />;

  if (detail.status === "error") {
    return detail.notFound ? (
      <div className="space-y-4">
        <ErrorState variant="card" message="Kasus tidak ditemukan." />
        <Link
          href="/suites"
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Kembali ke Suites
        </Link>
      </div>
    ) : (
      <ErrorState
        variant="card"
        message="Gagal memuat kasus."
        onRetry={detail.reload}
      />
    );
  }
  const { saved } = detail;
  const editable = isCaseEditable(saved.status);
  const canChangeTag = canChangeTagAsAdmin(user?.role ?? null, saved);
  
  const suitePath = `/suites/${encodeURIComponent(saved.suite_id)}`;

  function leaveTo(path: string) {
    if (
      dirty &&
      !confirm("Ada perubahan yang belum disimpan. Tinggalkan halaman ini?")
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
    showToast("Tag kasus diubah");
  }

  async function handleSubmit(payload: CaseWritePayload): Promise<FieldSaveError | null> {
    saveError.clear();
    try {
      detail.replace(await updateCase(caseId, payload));
      setFormKey((key) => key + 1);
      showToast("Perubahan tersimpan");
      return null;
    } catch (error) {
      return saveError.handle(error);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Suite", onClick: () => leaveTo("/suites") },
          { label: suiteName, onClick: () => leaveTo(suitePath) },
          { label: saved.case_code },
        ]}
      />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-xl font-semibold text-slate-900">{saved.case_code}</h1>
            <CaseStatusBadge status={saved.status} />
            <SplitTagBadge tag={saved.split_tag} wasDev={saved.was_dev} />
          </div>
          {dirty && (
            <p className="text-xs font-medium text-amber-700">Ada perubahan yang belum disimpan</p>
          )}
        </div>
        {canChangeTag && (
          <div className="flex flex-col items-end gap-1">
            <button
              type="button"
              onClick={() => setChangingTag(true)}
              // Form dimuat ulang setelah tag berubah, jadi perubahan yang belum disimpan akan hilang.
              disabled={dirty}
              className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg aria-hidden="true" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M13.6 2.6a2 2 0 0 1 2.8 2.8l-8.5 8.5-3.6.8.8-3.6 8.5-8.5Z" />
                <path d="M3 17h14v1.5H3z" />
              </svg>
              Ubah tag
            </button>
            {dirty && (
              <p className="text-[11px] text-slate-500">Simpan perubahan dulu untuk mengubah tag</p>
            )}
          </div>
        )}
      </header>

      <button
        type="button"
        onClick={() => leaveTo(suitePath)}
        className="inline-block text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer"
      >
        Kembali ke suite
      </button>

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

        {saveError.message !== null && (
          <ErrorState message={saveError.message} />
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
                  showToast("Kasus diajukan untuk direview");
                }}
              />
            ) : null
          }
        />
      </div>

      {changingTag && (
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
  );
}
