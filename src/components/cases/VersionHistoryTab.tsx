"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useCaseVersions } from "@/hooks/useCaseVersions";
import { describeChanged } from "@/lib/cases/versionSections";
import { formatWib } from "@/lib/datetime/formatWib";
import { fill, messages } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import type { VersionSummary } from "@/types/caseVersion";
import { CaseStatusBadge } from "./CaseStatusBadge";
import { VersionCompareView } from "./VersionCompareView";

const COPY = messages({
  id: {
    caption: "Riwayat versi kasus",
    version: "Versi",
    versionNo: "Versi {number}",
    status: "Status",
    author: "Diubah oleh",
    time: "Waktu",
    changed: "Bagian yang berubah",
    loading: "Memuat riwayat versi…",
    emptyTitle: "Belum ada riwayat versi",
    emptyDescription: "Riwayat muncul setelah kasus ini tersimpan sebagai versi.",
  },
  en: {
    caption: "Case version history",
    version: "Version",
    versionNo: "Version {number}",
    status: "Status",
    author: "Changed by",
    time: "Time",
    changed: "Sections that changed",
    loading: "Loading version history…",
    emptyTitle: "No version history yet",
    emptyDescription: "History appears after this case is saved as a version.",
  },
});

function VersionTable({ versions }: Readonly<{ versions: VersionSummary[] }>) {
  const copy = useText(COPY);
  const locale = useLocale();
  return (
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="w-full border-collapse text-left text-xs">
        <caption className="sr-only">{copy.caption}</caption>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
            <th scope="col" className="px-4 py-3">{copy.version}</th>
            <th scope="col" className="px-4 py-3">{copy.status}</th>
            <th scope="col" className="px-4 py-3">{copy.author}</th>
            <th scope="col" className="px-4 py-3">{copy.time}</th>
            <th scope="col" className="px-4 py-3">{copy.changed}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {versions.map((version) => (
            <tr key={version.version_no}>
              <th scope="row" className="px-4 py-3 font-mono font-medium text-slate-800">
                {fill(copy.versionNo, { number: version.version_no })}
              </th>
              <td className="px-4 py-3">
                <CaseStatusBadge status={version.status} />
              </td>
              <td className="px-4 py-3 text-slate-800">{version.author.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {formatWib(version.created_at)}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {describeChanged(version.version_no, version.changed, locale)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Isi tab "Riwayat versi": siapa mengubah, kapan, dan bagian apa, lalu pembanding dua versi. */
export function VersionHistoryTab({ caseId }: Readonly<{ caseId: string }>) {
  const copy = useText(COPY);
  const history = useCaseVersions(caseId);

  if (history.status === "loading") return <LoadingState label={copy.loading} />;

  if (history.status === "error") {
    return <ErrorState variant="card" message={history.message} onRetry={history.reload} />;
  }

  if (history.versions.length === 0) {
    return (
      <EmptyState
        title={copy.emptyTitle}
        description={copy.emptyDescription}
      />
    );
  }

  return (
    <div className="space-y-8">
      <VersionTable versions={history.versions} />

      <VersionCompareView caseId={caseId} versions={history.versions} />
    </div>
  );
}
