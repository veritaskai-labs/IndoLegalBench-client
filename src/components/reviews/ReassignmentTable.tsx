"use client";

import { ROUND_STATUS_LABEL } from "@/lib/reviews/reviewLabels";
import {
  activeAssignments,
  reassignmentReason,
  reviewerName,
  voidedReplaceText,
} from "@/lib/reviews/reviewQueue";
import type {
  ReassignmentAssignment,
  ReassignmentRow,
} from "@/types/reviewAdmin";

type Props = {
  rows: ReassignmentRow[];
  onReplace: (assignment: ReassignmentAssignment, row: ReassignmentRow) => void;
};

/** AC8. Hanya menggambar: data dan aksinya dari props, tidak ada panggilan jaringan di sini. */
export function ReassignmentTable({ rows, onReplace }: Readonly<Props>) {
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
            Reviewer aktif
          </th>
          <th scope="col" className="py-3 px-4">
            Alasan
          </th>
          <th scope="col" className="py-3 px-4">
            Aksi
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((queued) => {
          const active = activeAssignments(queued);

          /**
           * AC8: kasus yang reviewernya dinonaktifkan justru yang paling perlu diganti,
           * jadi penugasan void ikut dapat tombol. Labelnya dibedakan supaya admin tahu
           * penugasan mana yang sedang ia ganti.
           */
          const swappable = [
            ...active.map((item) => ({
              item,
              text: "Ganti reviewer",
              label: `Ganti reviewer ${reviewerName(item)}`,
            })),
            ...queued.void_assignments.map((item) => ({
              item,
              text: voidedReplaceText(item),
              label: `${voidedReplaceText(item)} ${reviewerName(item)}`,
            })),
          ];

          return (
            <tr
              key={queued.round_id}
              className="border-b border-slate-100 align-top hover:bg-slate-50"
            >
              <td className="py-3 px-4 font-mono text-xs text-slate-700">
                {queued.case_code}
              </td>
              <td className="py-3 px-4 text-slate-900">{queued.case_title}</td>
              <td className="py-3 px-4 text-slate-700">{`Ronde ${queued.round_no}`}</td>
              <td className="py-3 px-4 text-slate-700">
                {ROUND_STATUS_LABEL[queued.round_status]}
              </td>
              <td className="py-3 px-4 text-slate-700">
                {active.length === 0 ? "—" : active.map(reviewerName).join(", ")}
              </td>
              <td className="py-3 px-4 text-slate-600">
                {reassignmentReason(queued)}
              </td>
              <td className="py-3 px-4">
                {swappable.length === 0 ? (
                  <span className="text-slate-500">Belum ada penugasan</span>
                ) : (
                  <ul className="space-y-1">
                    {swappable.map(({ item, text, label }) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          aria-label={label}
                          onClick={() => onReplace(item, queued)}
                          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100"
                        >
                          {text}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}