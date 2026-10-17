"use client";

import { useCallback, useId, useState } from "react";
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

export function SubmitReviewButton({
  caseId,
  ready,
  dirty = false,
  onSubmitted,
}: Readonly<Props>) {
  const [blockers, setBlockers] = useState<MissingSection[]>([]);
  const hintId = useId();

  const action = useCallback(() => submitForReview(caseId), [caseId]);

  const toMessage = useCallback((failure: unknown) => {
    setBlockers(submitBlockers(failure));
    return mapSubmitError(failure);
  }, []);

  const { run, pending, error } = useAsyncAction(action, onSubmitted, toMessage);

  // Tombolnya tetap bisa difokus meski terhalang, supaya pengguna papan tunjuk
  // dan pembaca layar ikut mendengar alasannya; yang diabaikan kliknya, bukan fokusnya.
  const blocked = !ready || dirty || pending;

  const handleClick = useCallback(() => {
    if (blocked) return;
    run();
  }, [blocked, run]);

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        aria-disabled={blocked}
        aria-describedby={dirty ? hintId : undefined}
        className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:hover:bg-indigo-600"
      >
        {pending ? "Mengajukan…" : "Ajukan review"}
      </button>

      {dirty && (
        <p id={hintId} className="mt-2 text-xs text-amber-700">
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