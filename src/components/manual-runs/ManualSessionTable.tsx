"use client";

import Link from "next/link";
import { SessionStatusBadge } from "@/components/runs/SessionStatusBadge";
import { LoadingSkeleton, ProgressBar } from "@/components/ui";
import { formatWib } from "@/lib/datetime/formatWib";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { caseCountText, unknownName } from "@/lib/runs/sessionRules";
import type { SessionListItem } from "@/types/measurement";

const COPY = messages({
  id: {
    label: "Label",
    created: "Dibuat",
    creator: "Pembuat",
    product: "Produk",
    cases: "Kasus",
    repetitions: "Pengulangan",
    status: "Status",
    progress: "Progres",
    actions: "Aksi",
    filled: "{completed} dari {total} jawaban terisi",
    percent: "Persen jawaban terisi",
    view: "Lihat detail",
    fill: "Isi jawaban",
  },
  en: {
    label: "Label",
    created: "Created",
    creator: "Created by",
    product: "Product",
    cases: "Cases",
    repetitions: "Repetitions",
    status: "Status",
    progress: "Progress",
    actions: "Actions",
    filled: "{completed} of {total} answers filled in",
    percent: "Percent of answers filled in",
    view: "View details",
    fill: "Fill in answers",
  },
});

const COLUMNS = 9;

export function ManualSessionTable({
  sessions,
  loading,
}: Readonly<{
  sessions: readonly SessionListItem[];
  loading: boolean;
}>) {
  const copy = useText(COPY);
  return (
    <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
          <tr>
            <th scope="col" className="px-4 py-3">{copy.label}</th>
            <th scope="col" className="px-4 py-3">{copy.created}</th>
            <th scope="col" className="px-4 py-3">{copy.creator}</th>
            <th scope="col" className="px-4 py-3">{copy.product}</th>
            <th scope="col" className="px-4 py-3">{copy.cases}</th>
            <th scope="col" className="px-4 py-3">{copy.repetitions}</th>
            <th scope="col" className="px-4 py-3">{copy.status}</th>
            <th scope="col" className="px-4 py-3">{copy.progress}</th>
            <th scope="col" className="px-4 py-3">
              <span className="sr-only">{copy.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading && <LoadingSkeleton variant="table" rows={3} columns={COLUMNS} />}
          {sessions.map((item) => (
            <ManualSessionRow key={item.id} session={item} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManualSessionRow({ session }: Readonly<{ session: SessionListItem }>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const { completed, total } = session.progress;
  const progressText = fill(copy.filled, { completed, total });
  const progressPercent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <tr className="align-top hover:bg-slate-50/50">
      <td className="px-4 py-3 font-medium text-slate-900">
        <Link href={`/manual-runs/${encodeURIComponent(session.id)}`} className="hover:underline">
          {session.label}
        </Link>
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatWib(session.created_at)}</td>
      <td className="px-4 py-3 text-slate-600">{unknownName(session.created_by_name, locale)}</td>
      <td className="px-4 py-3 text-slate-600">{unknownName(session.product_name, locale)}</td>
      <td className="px-4 py-3 text-slate-600">{caseCountText(session.case_count)}</td>
      <td className="px-4 py-3 text-slate-600">{session.repetitions}</td>
      <td className="px-4 py-3">
        <SessionStatusBadge status={session.status} />
      </td>
      <td className="px-4 py-3 whitespace-nowrap text-slate-600 font-medium">
        {progressText}
        <ProgressBar percent={progressPercent} label={copy.percent} className="mt-1.5" />
      </td>
      <td className="px-4 py-3 text-right whitespace-nowrap">
        <Link
          href={`/manual-runs/${encodeURIComponent(session.id)}`}
          className="text-xs font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
        >
          {session.status === "finalized" ? copy.view : copy.fill}
        </Link>
      </td>
    </tr>
  );
}
