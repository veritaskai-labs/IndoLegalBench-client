"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CaseEditorForm } from "@/components/cases/CaseEditorForm";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { Breadcrumb } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import { useSaveErrorBanner } from "@/hooks/useSaveErrorBanner";
import { useSuiteName } from "@/hooks/useSuiteName";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { createCase } from "@/lib/cases/caseApi";
import type { CaseWritePayload } from "@/lib/cases/caseFormMapping";
import { caseEditPath } from "@/lib/cases/casePaths";
import type { FieldSaveError } from "@/lib/cases/saveError";
import { decodeRouteParam } from "@/lib/routeParams";

export default function NewCasePage() {
  const suiteId = decodeRouteParam(useParams<{ id: string }>().id);
  const router = useRouter();
  const { showToast } = useToast();
  const saveError = useSaveErrorBanner();
  const suiteName = useSuiteName(suiteId);
  const suitePath = `/suites/${encodeURIComponent(suiteId)}`;
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesWarning(dirty);

  function leaveTo(path: string) {
    if (dirty && !confirm("Ada perubahan yang belum disimpan. Tinggalkan halaman ini?")) {
      return;
    }
    router.push(path);
  }

  async function handleSubmit(payload: CaseWritePayload): Promise<FieldSaveError | null> {
    saveError.clear();
    try {
      const created = await createCase(suiteId, payload);
      showToast("Kasus tersimpan sebagai draf");
      router.push(caseEditPath(created.id));
      return null;
    } catch (error) {
      return saveError.handle(error);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-2">
        <Breadcrumb
          items={[
            { label: "Suite dan kasus", onClick: () => leaveTo("/suites") },
            { label: suiteName, onClick: () => leaveTo(suitePath) },
            { label: "Kasus baru" },
          ]}
        />
      </div>

      <button
        type="button"
        onClick={() => leaveTo(suitePath)}
        aria-label="Kembali ke suite"
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

      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="font-serif text-4xl leading-10 text-ink">Kasus baru</h1>
        {/* Kasus baru selalu disimpan server sebagai draf. */}
        <CaseStatusBadge status="draft" />
      </div>

      <p className="clear-left mt-2 text-sm text-muted">
        Indikator kelengkapan muncul setelah draf pertama disimpan.
      </p>

      <div className="mt-6 space-y-6">
        {saveError.message !== null && <ErrorState variant="banner" message={saveError.message} />}

        <CaseEditorForm onSubmit={handleSubmit} onDirtyChange={setDirty} />
      </div>
    </div>
  );
}
