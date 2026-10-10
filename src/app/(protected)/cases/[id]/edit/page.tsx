"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CaseEditorForm } from "@/components/cases/CaseEditorForm";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { CompletenessIndicator } from "@/components/cases/CompletenessIndicator";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import { CaseTabs, panelId, tabId, type CaseTab } from "@/components/cases/CaseTabs";
import { LockedVersionNotice } from "@/components/cases/LockedVersionNotice";
import { VersionHistoryTab } from "@/components/cases/VersionHistoryTab";
import { useAuth } from "@/hooks/useAuth";
import { useCaseCompleteness } from "@/hooks/useCaseCompleteness";
import { useCaseDetail } from "@/hooks/useCaseDetail";
import { useSaveErrorBanner } from "@/hooks/useSaveErrorBanner";
import { useStartNewVersion } from "@/hooks/useStartNewVersion";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { updateCase } from "@/lib/cases/caseApi";
import { fromCaseRead, type CaseWritePayload } from "@/lib/cases/caseFormMapping";
import { canStartNewVersion, isCaseEditable } from "@/lib/cases/permissions";
import type { CaseRead } from "@/types/case";
import type { FieldSaveError } from "@/lib/cases/saveError";
import { decodeRouteParam } from "@/lib/routeParams";
import { Breadcrumb } from "@/components/ui";
import { useSuiteName } from "@/hooks/useSuiteName";
import Link from "next/link";

export default function EditCasePage() {
  const caseId = decodeRouteParam(useParams<{ id: string }>().id);
  const detail = useCaseDetail(caseId);
  const { showToast } = useToast();
  const saveError = useSaveErrorBanner();
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState<CaseTab>("editor");
  // Kunci baru me-remount form dengan data tersimpan, jadi status dirty ikut bersih.
  const [formKey, setFormKey] = useState(0);
  // formKey naik tiap simpan berhasil, jadi kelengkapan ikut dihitung ulang server.
  const completeness = useCaseCompleteness(caseId, formKey);
  const router = useRouter();
  const auth = useAuth();
  const role = auth.status === "authenticated" ? auth.user.role : null;
  // Form diisi dari draf hasil POST, bukan GET: GET masih mengembalikan versi yang disetujui.
  const startVersion = useStartNewVersion(caseId, (draft: CaseRead) => {
    detail.replace(draft);
    setFormKey((key) => key + 1);
    showToast("Versi baru dibuat. Perubahan akan ditinjau ulang sebelum berlaku");
  });
  const suiteName = useSuiteName( detail.status === "ready" ? detail.saved.suite_id : null);

  useUnsavedChangesWarning(dirty);

  if (detail.status === "loading") return <LoadingState label="Memuat kasus…" />;

  if (detail.status === "error") {
    return detail.notFound ? (
      <div className="space-y-4">
        <ErrorState variant="card" message="Kasus tidak ditemukan." />
        <Link href="/suites" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
          Kembali ke Suites
        </Link>
      </div>
    ) : (
      <ErrorState variant="card" message="Gagal memuat kasus." onRetry={detail.reload} />
    );
  }
  const { saved } = detail;
  const editable = isCaseEditable(saved.status);
  
  const suitePath = `/suites/${encodeURIComponent(saved.suite_id)}`;

  function leaveTo(path: string) {
    if (dirty && !confirm("Ada perubahan yang belum disimpan. Tinggalkan halaman ini?")) {
      return;
    }
    router.push(path);
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

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{saved.case_code}</h1>
        <CaseStatusBadge status={saved.status} />
        {dirty && (
          <p className="text-xs font-medium text-amber-700">Ada perubahan yang belum disimpan</p>
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
        <CompletenessIndicator {...completeness} onRetry={completeness.reload} />
      
        {saveError.message !== null && <ErrorState message={saveError.message} />}

        {!editable && (
          <LockedVersionNotice
            approved={saved.status === "approved"}
            canStart={canStartNewVersion(role, saved.status)}
            pending={startVersion.pending}
            error={startVersion.error}
            onStart={startVersion.start}
          />
        )}

        <CaseEditorForm
          key={formKey}
          defaultValues={fromCaseRead(saved)}
          onSubmit={handleSubmit}
          onDirtyChange={setDirty}
          readOnly={!editable}
        />
      </div>

      {tab === "history" && (
        <div role="tabpanel" id={panelId("history")} aria-labelledby={tabId("history")}>
          <VersionHistoryTab key={caseId} caseId={caseId} />
        </div>
      )}
    </div>
  );
}
