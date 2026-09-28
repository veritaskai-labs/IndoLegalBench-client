"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CaseEditorForm } from "@/components/cases/CaseEditorForm";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import { createCase } from "@/lib/cases/caseApi";
import type { CaseWritePayload } from "@/lib/cases/caseFormMapping";
import { decodeRouteParam } from "@/lib/routeParams";

export default function NewCasePage() {
  const suiteId = decodeRouteParam(useParams<{ id: string }>().id);
  const router = useRouter();
  const { showToast } = useToast();
  const [saveError, setSaveError] = useState<string | null>(null);

  async function handleSubmit(payload: CaseWritePayload) {
    setSaveError(null);
    try {
      const created = await createCase(suiteId, payload);
      showToast("Kasus tersimpan sebagai draf");
      router.push(`/cases/${encodeURIComponent(created.id)}/edit`);
    } catch {
      setSaveError("Gagal menyimpan kasus. Coba lagi.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header className="flex items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">Kasus baru</h1>
        <span className="rounded bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-700">
          Draft
        </span>
      </header>

      {saveError !== null && <ErrorState message={saveError} />}

      <CaseEditorForm onSubmit={handleSubmit} />
    </div>
  );
}
