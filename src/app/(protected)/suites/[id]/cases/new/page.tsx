"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CaseEditorForm } from "@/components/cases/CaseEditorForm";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import { createCase } from "@/lib/cases/caseApi";
import type { CaseWritePayload } from "@/lib/cases/caseFormMapping";
import { mapSaveError, type FieldSaveError } from "@/lib/cases/saveError";
import { decodeRouteParam } from "@/lib/routeParams";

export default function NewCasePage() {
  const suiteId = decodeRouteParam(useParams<{ id: string }>().id);
  const router = useRouter();
  const { showToast } = useToast();
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSubmit(payload: CaseWritePayload): Promise<FieldSaveError | null> {
    setSaveError(null);
    try {
      const created = await createCase(suiteId, payload);
      showToast("Kasus tersimpan sebagai draf");
      router.push(`/cases/${encodeURIComponent(created.id)}/edit`);
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
      <header className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Kasus baru</h1>
        {/* Kasus baru selalu disimpan server sebagai draf. */}
        <CaseStatusBadge status="draft" />
      </header>

      {saveError !== null && <ErrorState message={saveError} />}

      <CaseEditorForm onSubmit={handleSubmit} />
    </div>
  );
}
