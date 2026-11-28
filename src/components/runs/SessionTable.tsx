"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { SessionStatusBadge } from "@/components/runs/SessionStatusBadge";
import { LoadingSkeleton, ProgressBar } from "@/components/ui";
import { formatWib } from "@/lib/datetime/formatWib";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages, type Locale } from "@/lib/i18n/locale";
import { caseCountText, formatProgress, unknownName } from "@/lib/runs/sessionRules";
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
    percent: "Persen kasus selesai",
    view: "Lihat detail",
    viewLabel: "Lihat detail {label}",
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
    percent: "Percent of cases complete",
    view: "View details",
    viewLabel: "View details {label}",
  },
});

const COLUMNS = 9;

type SessionCopy = (typeof COPY)["id"];

/**
 * Tabel sesi pengukuran (PBI-11 AC10), dipakai daftar utama dan daftar arsip dengan kolom yang sama.
 * Kolom Aksi berisi tautan Lihat detail dan aksi dari pemanggil lewat renderAction: Arsipkan di daftar
 * utama, Kembalikan di arsip.
 */
export function SessionTable({
  sessions,
  loading,
  renderAction,
}: Readonly<{
  sessions: readonly SessionListItem[];
  loading: boolean;
  renderAction: (session: SessionListItem) => ReactNode;
}>) {
  const copy = useText(COPY);
  const locale = useLocale();
  return (
    // relative: keeps sr-only labels inside the scroll box on a phone (SCRUM-204 F2).
    <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
          <tr>
            <th scope="col" className="px-3 py-2.5">{copy.label}</th>
            <th scope="col" className="px-3 py-2.5">{copy.created}</th>
            <th scope="col" className="px-3 py-2.5">{copy.creator}</th>
            <th scope="col" className="px-3 py-2.5">{copy.product}</th>
            <th scope="col" className="px-3 py-2.5">{copy.cases}</th>
            <th scope="col" className="px-3 py-2.5">{copy.repetitions}</th>
            <th scope="col" className="px-3 py-2.5">{copy.status}</th>
            <th scope="col" className="px-3 py-2.5">{copy.progress}</th>
            <th scope="col" className="px-3 py-2.5">
              <span className="sr-only">{copy.actions}</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {loading && <LoadingSkeleton variant="table" rows={3} columns={COLUMNS} />}
          {sessions.map((item) => (
            <SessionRow key={item.id} session={item} action={renderAction(item)} locale={locale} copy={copy} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SessionRow({
  session,
  action,
  locale,
  copy,
}: Readonly<{
  session: SessionListItem;
  action: ReactNode;
  locale: Locale;
  copy: SessionCopy;
}>) {
  const detailHref = `/runs/${encodeURIComponent(session.id)}`;
  return (
    <tr className="align-top">
      <td className="min-w-56 px-3 py-2.5 font-medium text-slate-900">
        <Link href={detailHref} className="hover:underline">
          {session.label}
        </Link>
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{formatWib(session.created_at)}</td>
      <td className="px-3 py-2.5 text-slate-600">{unknownName(session.created_by_name, locale)}</td>
      <td className="px-3 py-2.5 text-slate-600">{unknownName(session.product_name, locale)}</td>
      <td className="px-3 py-2.5 text-slate-600">{caseCountText(session.case_count)}</td>
      <td className="px-3 py-2.5 text-slate-600">{session.repetitions}</td>
      <td className="px-3 py-2.5">
        <SessionStatusBadge status={session.status} />
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
        {formatProgress(session, locale)}
        <ProgressBar percent={session.progress.percent_cases_complete} label={copy.percent} className="mt-1.5" />
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-3 whitespace-nowrap text-xs font-medium">
          <Link href={detailHref} aria-label={fill(copy.viewLabel, { label: session.label })} className="text-accent-ink hover:underline">
            {copy.view}
          </Link>
          {action}
        </div>
      </td>
    </tr>
  );
}
