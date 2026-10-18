"use client";

import { useState } from "react";

import type { ReplaceReviewerBody, ReviewerOption } from "@/types/reviewAdmin";

type Props = {
  caseCode: string;
  currentReviewerId: string;
  currentReviewerName: string;
  candidates: ReviewerOption[];
  pending: boolean;
  error: string | null;
  notice?: string | null;
  onConfirm: (body: ReplaceReviewerBody) => void;
  onClose: () => void;
};

/** AC7. Alasan wajib dan satu langkah konfirmasi, karena penilaian reviewer lama jadi hangus. */
export function SwapReviewerDialog({
  caseCode,
  currentReviewerId,
  currentReviewerName,
  candidates,
  pending,
  error,
  notice,
  onConfirm,
  onClose,
}: Readonly<Props>) {
  const [reviewerId, setReviewerId] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);

  const options = candidates.filter((item) => item.id !== currentReviewerId);
  const trimmed = reason.trim();
  const chosen = options.find((item) => item.id === reviewerId);
  const ready = chosen !== undefined && trimmed !== "";

  return (
    <dialog
      open
      aria-modal="true"
      aria-labelledby="swap-reviewer-title"
      className="static m-0 w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-lg"
    >
      <h2
        id="swap-reviewer-title"
        className="text-base font-semibold text-slate-900"
      >
        Ganti reviewer
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {notice ? (
          <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">
            {notice}
            </p>
          ) : null}
          {`${caseCode} · reviewer sekarang ${currentReviewerName}`}
      </p>

      {confirming && chosen ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-slate-700">
            {`Ganti ${currentReviewerName} dengan ${chosen.name}? Penilaian reviewer lama tidak dihitung.`}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                onConfirm({ new_reviewer_id: chosen.id, reason: trimmed })
              }
              className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              {pending ? "Menyimpan…" : "Ya, ganti reviewer"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => setConfirming(false)}
              className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
            >
              Kembali
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor="swap-reviewer-new"
              className="block text-sm font-medium text-slate-700"
            >
              Reviewer baru
            </label>
            <select
              id="swap-reviewer-new"
              value={reviewerId}
              onChange={(event) => setReviewerId(event.target.value)}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            >
              <option value="">Pilih reviewer</option>
              {options.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="swap-reviewer-reason"
              className="block text-sm font-medium text-slate-700"
            >
              Alasan penggantian
            </label>
            <textarea
              id="swap-reviewer-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded border border-slate-300 px-2 py-2 text-sm"
            />
            <p className="mt-1 text-xs text-slate-500">
              Alasan wajib diisi dan tercatat di log audit.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              disabled={!ready}
              onClick={() => setConfirming(true)}
              className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              Lanjut
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-3 py-2 text-sm text-slate-700"
            >
              Batal
            </button>
          </div>
        </div>
      )}

      {error !== null && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {error}
        </p>
      )}
      </dialog>
  );
}