"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { CaseEditorForm } from "@/components/cases/CaseEditorForm";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { Breadcrumb } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import { useSuiteName } from "@/hooks/useSuiteName";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { createCase } from "@/lib/cases/caseApi";
import type { CaseWritePayload } from "@/lib/cases/caseFormMapping";
import { caseEditPath } from "@/lib/cases/casePaths";
import { mapSaveError, type FieldSaveError } from "@/lib/cases/saveError";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { decodeRouteParam } from "@/lib/routeParams";
import { messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";

const COPY = messages({
  id: {
    crumb: "Suite dan kasus",
    heading: "Kasus baru",
    back: "Kembali ke suite",
    leave: "Ada perubahan yang belum disimpan. Tinggalkan halaman ini?",
    saved: "Kasus tersimpan sebagai draf",
    hint: "Indikator kelengkapan muncul setelah draf pertama disimpan.",
  },
  en: {
    crumb: "Suites and cases",
    heading: "New case",
    back: "Back to the suite",
    leave: "There are unsaved changes. Leave this page?",
    saved: "Case saved as a draft",
    hint: "The completeness indicator appears after the first draft is saved.",
  },
});

export default function NewCasePage() {
  const copy = useText(COPY);
  const locale = useLocale();
  const suiteId = decodeRouteParam(useParams<{ id: string }>().id);
  const router = useRouter();
  const { showToast } = useToast();
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const suiteName = useSuiteName(suiteId);
  const suitePath = `/suites/${encodeURIComponent(suiteId)}`;
  const [dirty, setDirty] = useState(false);
  useUnsavedChangesWarning(dirty);

  function leaveTo(path: string) {
    if (dirty && !confirm(copy.leave)) {
      return;
    }
    router.push(path);
  }

  async function handleSubmit(payload: CaseWritePayload): Promise<FieldSaveError | null> {
    setSaveMessage(null);
    try {
      const created = await createCase(suiteId, payload);
      showToast(copy.saved);
      router.push(caseEditPath(created.id));
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
            { label: copy.heading },
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

      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="font-serif text-4xl leading-10 text-ink">{copy.heading}</h1>
        {/* Kasus baru selalu disimpan server sebagai draf. */}
        <CaseStatusBadge status="draft" />
      </div>

      <p className="clear-left mt-2 text-sm text-muted">
        {copy.hint}
      </p>

      <div className="mt-6 space-y-6">
        {saveMessage !== null && <ErrorState variant="banner" message={saveMessage} />}

        <CaseEditorForm onSubmit={handleSubmit} onDirtyChange={setDirty} />
      </div>
    </div>
  );
}
