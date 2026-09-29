"use client";

import { useParams, useRouter } from "next/navigation";
import { CaseEditorForm } from "@/components/cases/CaseEditorForm";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import { useSaveErrorBanner } from "@/hooks/useSaveErrorBanner";
import { createCase } from "@/lib/cases/caseApi";
import type { CaseWritePayload } from "@/lib/cases/caseFormMapping";
import type { FieldSaveError } from "@/lib/cases/saveError";
import { decodeRouteParam } from "@/lib/routeParams";

export default function NewCasePage() {
  const suiteId = decodeRouteParam(useParams<{ id: string }>().id);
  const router = useRouter();
  const { showToast } = useToast();
  const saveError = useSaveErrorBanner();

  async function handleSubmit(payload: CaseWritePayload): Promise<FieldSaveError | null> {
    saveError.clear();
    try {
      const created = await createCase(suiteId, payload);
      showToast("Kasus tersimpan sebagai draf");
      router.push(`/cases/${encodeURIComponent(created.id)}/edit`);
      return null;
    } catch (error) {
      return saveError.handle(error);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Kasus baru</h1>
        {/* Kasus baru selalu disimpan server sebagai draf. */}
        <CaseStatusBadge status="draft" />
      </header>

      {saveError.message !== null && <ErrorState message={saveError.message} />}

      <CaseEditorForm onSubmit={handleSubmit} />
    </div>
  );
}
