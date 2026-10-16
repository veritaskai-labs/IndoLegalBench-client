"use client";

import { useCallback, useState } from "react";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import type { MissingSection } from "@/lib/apiClient";
import { submitForReview, type ReviewSubmission } from "@/lib/cases/submitApi";
import { mapSubmitError, submitBlockers } from "@/lib/cases/submitErrors";

type Props = {
  caseId: string;
  ready: boolean;
  dirty?: boolean;
  onSubmitted: (result: ReviewSubmission) => void;
};

export function SubmitReviewButton({ caseId, ready, dirty = false, onSubmitted }: Readonly<Props>) {
  const [blockers, setBlockers] = useState<MissingSection[]>([]);

  const action = useCallback(() => submitForReview(caseId), [caseId]);

  const toMessage = useCallback((failure: unknown) => {
    setBlockers(submitBlockers(failure));
    return mapSubmitError(failure);
  }, []);

  const { run, pending, error } = useAsyncAction(
    action,
    onSubmitted,
    toMessage,
  );

  return (
    <div>
      <button
        type="button"
        onClick={run}
        disabled={!ready || dirty || pending}
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
      >
        {pending ? "Mengajukan…" : "Ajukan review"}
      </button>

      {dirty && (
        <p className="mt-2 text-xs text-amber-700">
          Simpan perubahan dulu sebelum mengajukan.
        </p>
      )}

      {error !== null && (
        <div
          role="alert"
          className="mt-2 rounded-md bg-red-50 p-3 text-xs text-red-800"
        >
          <p>{error}</p>
          {blockers.length > 0 && (
            <ul className="mt-2 list-disc pl-4">
              {blockers.map((item) => (
                <li key={item.field}>{item.message}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
