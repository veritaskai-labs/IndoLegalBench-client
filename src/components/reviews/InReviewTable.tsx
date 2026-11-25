"use client";

import type { InReviewRow } from "@/lib/reviews/inReviewApi";
import {
  ASSIGNMENT_STATUS_LABEL,
  ROUND_DECISION_LABEL,
  ROUND_STATUS_LABEL,
  newVersionLabel,
  verdictLabel,
} from "@/lib/reviews/reviewLabels";
import type { CaseReview, ReviewerSlot } from "@/types/reviewAdmin";

type Props = {
  rows: InReviewRow[];
  onReplace?: (slot: ReviewerSlot, row: InReviewRow) => void;
};

/** AC3 dan AC7. Hanya menggambar; keputusan reviewer ditampilkan apa adanya karena Admin boleh melihat semua. */
export function InReviewTable({ rows, onReplace }: Readonly<Props>) {
  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 text-xs font-medium text-slate-600">
        <tr>
          <th scope="col" className="py-3 px-4">
            Kode
          </th>
          <th scope="col" className="py-3 px-4">
            Judul
          </th>
          <th scope="col" className="py-3 px-4">
            Ronde
          </th>
          <th scope="col" className="py-3 px-4">
            Status ronde
          </th>
          <th scope="col" className="py-3 px-4">
            Keputusan
          </th>
          <th scope="col" className="py-3 px-4">
            Reviewer dan penilaian
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <InReviewTableRow key={row.case.id} row={row} onReplace={onReplace} />
        ))}
      </tbody>
    </table>
  );
}

/** Satu kasus: kode, judul dengan penanda versi baru (F-02), ronde, keputusan, dan reviewernya. */
function InReviewTableRow({
  row,
  onReplace,
}: Readonly<{ row: InReviewRow; onReplace?: Props["onReplace"] }>) {
  const { case: item, review } = row;
  const versionMark = newVersionLabel(row.newVersion);

  return (
    <tr className="border-b border-slate-100 align-top hover:bg-slate-50">
      <td className="py-3 px-4 font-mono text-xs text-slate-700">{item.case_code}</td>
      <td className="py-3 px-4 text-slate-900">
        {item.title}
        {versionMark === null ? null : (
          <div className="mt-1 text-xs text-indigo-700">{versionMark}</div>
        )}
      </td>
      <td className="py-3 px-4 text-slate-700">
        Ronde {review.round_no}
      </td>
      <td className="py-3 px-4 text-slate-700">
        {ROUND_STATUS_LABEL[review.status]}
      </td>
      <td className="py-3 px-4 text-slate-700">
        {review.decision ? ROUND_DECISION_LABEL[review.decision] : "Belum diputuskan"}
      </td>
      <td className="py-3 px-4 text-slate-700">
        <ReviewerCell
          review={review}
          onReplace={onReplace ? (slot) => onReplace(slot, row) : undefined}
        />
      </td>
    </tr>
  );
}

function ReviewerCell({
  review,
  onReplace,
}: Readonly<{
  review: CaseReview;
  onReplace?: (slot: ReviewerSlot) => void;
}>) {
  if (review.reviewers.length === 0) {
    return <span className="text-slate-500">Belum ada reviewer</span>;
  }

  return (
    <ul className="space-y-2">
      {review.reviewers.map((slot) => (
        <li key={slot.assignment_id}>
          <span className="text-slate-900">{slot.reviewer.name}</span>{" "}
          <span className="text-xs text-slate-500">
            {ASSIGNMENT_STATUS_LABEL[slot.status]}
          </span>
          <div className="text-xs text-slate-700">
            {verdictLabel(slot.verdict)}
          </div>
          {slot.verdict?.comment ? (
            <p className="mt-1 text-xs text-slate-600">{slot.verdict.comment}</p>
          ) : null}
          {/* AC7: hanya penugasan aktif yang bisa diganti; yang replaced atau void sudah selesai. */}
          {onReplace && slot.status === "active" ? (
            <button
              type="button"
              aria-label={`Ganti reviewer ${slot.reviewer.name}`}
              onClick={() => onReplace(slot)}
              className="mt-1 rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
            >
              Ganti reviewer
            </button>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
