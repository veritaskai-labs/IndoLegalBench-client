"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { CaseEditorForm } from "@/components/cases/CaseEditorForm";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useToast } from "@/components/ui/Toast";
import { useCaseDetail } from "@/hooks/useCaseDetail";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { updateCase } from "@/lib/cases/caseApi";
import { fromCaseRead, type CaseWritePayload } from "@/lib/cases/caseFormMapping";
import { CASE_STATUS_LABEL } from "@/lib/cases/caseStatus";
import { mapSaveError, type FieldSaveError } from "@/lib/cases/saveError";
import { decodeRouteParam } from "@/lib/routeParams";

export default function EditCasePage() {
  const caseId = decodeRouteParam(useParams<{ id: string }>().id);
  const detail = useCaseDetail(caseId);
  const { showToast } = useToast();
  const [saveError, setSaveError] = useState<string | null>(null);
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
    setSaveError(null);
    try {
      detail.replace(await updateCase(caseId, payload));
      setFormKey((key) => key + 1);
      showToast("Perubahan tersimpan");
      return null;
    } catch (error) {
      const mapped = mapSaveError(error);
      if (mapped.kind === "field") return mapped;
      setSaveError(mapped.message);
      return null;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{saved.case_code}</h1>
        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
          {CASE_STATUS_LABEL[saved.status]}
        </span>
        {dirty && (
          <p className="text-xs font-medium text-amber-700">Ada perubahan yang belum disimpan</p>
        )}
      </header>

      {saveError !== null && <ErrorState message={saveError} />}

      <CaseEditorForm
        key={formKey}
        defaultValues={fromCaseRead(saved)}
        onSubmit={handleSubmit}
        onDirtyChange={setDirty}
      />
    </div>
  );
}
