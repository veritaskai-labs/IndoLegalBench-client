"use client";

import { useState } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useVersionCompare } from "@/hooks/useVersionCompare";
import { CASE_STATUS_LABEL } from "@/lib/cases/caseStatus";
import type { VersionSummary } from "@/types/caseVersion";
import { VersionCompareResult } from "./VersionCompareResult";

const SAME_VERSION_HINT_ID = "compare-same-version-hint";

const SELECT_CLASS =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

function VersionSelect({
  label,
  value,
  versions,
  onChange,
}: {
  label: string;
  value: number;
  versions: VersionSummary[];
  onChange: (versionNo: number) => void;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select value={value} onChange={(event) => onChange(Number(event.target.value))} className={SELECT_CLASS}>
        {versions.map((version) => (
          <option key={version.version_no} value={version.version_no}>
            Versi {version.version_no} ({CASE_STATUS_LABEL[version.status]})
          </option>
        ))}
      </select>
    </label>
  );
}

/**
 * Pilih dua versi lalu bandingkan berdampingan. Versi terbaru dan sebelumnya terpilih lebih dulu,
 * dan perbandingan baru jalan setelah tombol ditekan supaya tidak menembak server di tiap pilihan.
 * versions sudah terurut dari yang terbaru. Dengan kurang dari dua versi tidak ada yang bisa dibandingkan.
 */
export function VersionCompareView({ caseId, versions }: { caseId: string; versions: VersionSummary[] }) {
  const [a, setA] = useState(versions[1]?.version_no ?? versions[0]?.version_no ?? 0);
  const [b, setB] = useState(versions[0]?.version_no ?? 0);
  const comparison = useVersionCompare(caseId);
  // Satu versi dengan dirinya sendiri tidak pernah menunjukkan perubahan, jadi tidak dikirim ke server.
  const sameVersion = a === b;

  if (versions.length < 2) {
    return <p className="text-xs text-slate-500">Perlu minimal dua versi untuk dibandingkan.</p>;
  }

  return (
    <section aria-label="Bandingkan versi" className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">Bandingkan dua versi</h2>

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-48 flex-1">
          <VersionSelect label="Versi A" value={a} versions={versions} onChange={setA} />
        </div>
        <div className="min-w-48 flex-1">
          <VersionSelect label="Versi B" value={b} versions={versions} onChange={setB} />
        </div>
        <button
          type="button"
          onClick={() => void comparison.compare(a, b)}
          disabled={comparison.status === "loading" || sameVersion}
          aria-describedby={sameVersion ? SAME_VERSION_HINT_ID : undefined}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          Bandingkan
        </button>
      </div>

      {sameVersion && (
        <p id={SAME_VERSION_HINT_ID} className="text-xs text-slate-500">
          Pilih dua versi yang berbeda untuk dibandingkan.
        </p>
      )}

      {comparison.status === "loading" && <LoadingState label="Membandingkan versi…" />}
      {comparison.status === "error" && (
        <ErrorState
          variant="card"
          message={comparison.message}
          onRetry={sameVersion ? undefined : () => void comparison.compare(a, b)}
        />
      )}
      {comparison.status === "ready" && <VersionCompareResult result={comparison.result} />}
    </section>
  );
}
