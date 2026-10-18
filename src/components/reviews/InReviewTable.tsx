"use client";

import type { InReviewRow } from "@/lib/reviews/inReviewApi";
import {
  ASSIGNMENT_STATUS_LABEL,
  ROUND_DECISION_LABEL,
  ROUND_STATUS_LABEL,
  verdictLabel,
} from "@/lib/reviews/reviewLabels";

type Props = {
  rows: InReviewRow[];
};

/** AC3. Hanya menggambar; keputusan reviewer ditampilkan apa adanya karena Admin boleh melihat semua. */
export function InReviewTable({ rows }: Readonly<Props>) {
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
        {rows.map(({ case: item, review }) => (
          <tr
            key={item.id}
            className="border-b border-slate-100 align-top hover:bg-slate-50"
          >
            <td className="py-3 px-4 font-mono text-xs text-slate-700">
              {item.case_code}
            </td>
            <td className="py-3 px-4 text-slate-900">{item.title}</td>
            <td className="py-3 px-4 text-slate-700">
              {review === null ? "—" : `Ronde ${review.round_no}`}
            </td>
            <td className="py-3 px-4 text-slate-700">
              {review === null ? "—" : ROUND_STATUS_LABEL[review.status]}
            </td>
            <td className="py-3 px-4 text-slate-700">
              {review?.decision
              ? ROUND_DECISION_LABEL[review.decision]
              : "Belum diputuskan"}
            </td>
            <td className="py-3 px-4 text-slate-700">
              <ReviewerCell review={review} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReviewerCell({ review }: Readonly<{ review: CaseReviewOrNull }>) {
  if (review === null) {
    return <span className="text-slate-500">Belum ada putaran review</span>;
  }

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
        </li>
      ))}
    </ul>
  );
}

type CaseReviewOrNull = InReviewRow["review"];