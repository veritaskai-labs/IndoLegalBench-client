"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useCaseVersions } from "@/hooks/useCaseVersions";
import { describeChanged } from "@/lib/cases/versionSections";
import { formatWib } from "@/lib/datetime/formatWib";
import { CaseStatusBadge } from "./CaseStatusBadge";

/** Isi tab "Riwayat versi": siapa mengubah, kapan, dan bagian apa. */
export function VersionHistoryTab({ caseId }: { caseId: string }) {
  const history = useCaseVersions(caseId);

  if (history.status === "loading") return <LoadingState label="Memuat riwayat versi…" />;

  if (history.status === "error") {
    return <ErrorState variant="card" message={history.message} onRetry={history.reload} />;
  }

  if (history.versions.length === 0) {
    return (
      <EmptyState
        title="Belum ada riwayat versi"
        description="Riwayat muncul setelah kasus ini tersimpan sebagai versi."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
      <table className="w-full border-collapse text-left text-xs">
        <caption className="sr-only">Riwayat versi kasus</caption>
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 font-semibold text-slate-700">
            <th scope="col" className="px-4 py-3">Versi</th>
            <th scope="col" className="px-4 py-3">Status</th>
            <th scope="col" className="px-4 py-3">Diubah oleh</th>
            <th scope="col" className="px-4 py-3">Waktu</th>
            <th scope="col" className="px-4 py-3">Bagian yang berubah</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {history.versions.map((version) => (
            <tr key={version.version_no}>
              <th scope="row" className="px-4 py-3 font-mono font-medium text-slate-800">
                Versi {version.version_no}
              </th>
              <td className="px-4 py-3">
                <CaseStatusBadge status={version.status} />
              </td>
              <td className="px-4 py-3 text-slate-800">{version.author.name}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                {formatWib(version.created_at)}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {describeChanged(version.version_no, version.changed)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
