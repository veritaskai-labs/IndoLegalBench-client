"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { CaseEditorForm } from "@/components/cases/CaseEditorForm";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import { useCaseDetail } from "@/hooks/useCaseDetail";
import { useSaveErrorBanner } from "@/hooks/useSaveErrorBanner";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { updateCase } from "@/lib/cases/caseApi";
import { fromCaseRead, type CaseWritePayload } from "@/lib/cases/caseFormMapping";
import type { FieldSaveError } from "@/lib/cases/saveError";
import { decodeRouteParam } from "@/lib/routeParams";

export default function EditCasePage() {
  const caseId = decodeRouteParam(useParams<{ id: string }>().id);
  const detail = useCaseDetail(caseId);
  const { showToast } = useToast();
  const saveError = useSaveErrorBanner();
  const [dirty, setDirty] = useState(false);
  // Kunci baru me-remount form dengan data tersimpan, jadi status dirty ikut bersih.
  const [formKey, setFormKey] = useState(0);

  useUnsavedChangesWarning(dirty);

  if (detail.status === "loading") return <LoadingState label="Memuat kasus…" />;

  if (detail.status === "error") {
    return detail.notFound ? (
      <ErrorState variant="card" message="Kasus tidak ditemukan." />
    ) : (
      <ErrorState variant="card" message="Gagal memuat kasus." onRetry={detail.reload} />
    );
  }

  const { saved } = detail;

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
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{saved.case_code}</h1>
        <CaseStatusBadge status={saved.status} />
        {dirty && (
          <p className="text-xs font-medium text-amber-700">Ada perubahan yang belum disimpan</p>
        )}
      </header>

      {saveError.message !== null && <ErrorState message={saveError.message} />}

      <CaseEditorForm
        key={formKey}
        defaultValues={fromCaseRead(saved)}
        onSubmit={handleSubmit}
        onDirtyChange={setDirty}
      />
    </div>
  );
}
