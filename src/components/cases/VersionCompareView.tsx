"use client";

import { useState } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useVersionCompare } from "@/hooks/useVersionCompare";
import { caseStatusLabel } from "@/lib/cases/caseStatus";
import { fill, messages } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import type { VersionSummary } from "@/types/caseVersion";
import { VersionCompareResult } from "./VersionCompareResult";

const COPY = messages({
  id: {
    needTwo: "Perlu minimal dua versi untuk dibandingkan.",
    region: "Bandingkan versi",
    heading: "Bandingkan dua versi",
    versionA: "Versi A",
    versionB: "Versi B",
    option: "Versi {number}",
    compare: "Bandingkan",
    same: "Pilih dua versi yang berbeda untuk dibandingkan.",
    loading: "Membandingkan versi…",
  },
  en: {
    needTwo: "At least two versions are needed to compare.",
    region: "Compare versions",
    heading: "Compare two versions",
    versionA: "Version A",
    versionB: "Version B",
    option: "Version {number}",
    compare: "Compare",
    same: "Choose two different versions to compare.",
    loading: "Comparing versions…",
  },
});

const SAME_VERSION_HINT_ID = "compare-same-version-hint";

const SELECT_CLASS =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

function VersionSelect({
  label,
  value,
  versions,
  onChange,
}: Readonly<{
  label: string;
  value: number;
  versions: VersionSummary[];
  onChange: (versionNo: number) => void;
}>) {
  const copy = useText(COPY);
  const locale = useLocale();
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <select value={value} onChange={(event) => onChange(Number(event.target.value))} className={SELECT_CLASS}>
        {versions.map((version) => (
          <option key={version.version_no} value={version.version_no}>
            {fill(copy.option, { number: version.version_no })} ({caseStatusLabel(version.status, locale)})
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
export function VersionCompareView({ caseId, versions }: Readonly<{ caseId: string; versions: VersionSummary[] }>) {
  const copy = useText(COPY);
  const [a, setA] = useState(versions[1]?.version_no ?? versions[0]?.version_no ?? 0);
  const [b, setB] = useState(versions[0]?.version_no ?? 0);
  const comparison = useVersionCompare(caseId);
  // Satu versi dengan dirinya sendiri tidak pernah menunjukkan perubahan, jadi tidak dikirim ke server.
  const sameVersion = a === b;

  if (versions.length < 2) {
    return <p className="text-xs text-slate-500">{copy.needTwo}</p>;
  }

  return (
    <section aria-label={copy.region} className="space-y-4">
      <h2 className="text-sm font-semibold text-slate-900">{copy.heading}</h2>

      <div className="flex flex-wrap items-end gap-4">
        <div className="min-w-48 flex-1">
          <VersionSelect label={copy.versionA} value={a} versions={versions} onChange={setA} />
        </div>
        <div className="min-w-48 flex-1">
          <VersionSelect label={copy.versionB} value={b} versions={versions} onChange={setB} />
        </div>
        <button
          type="button"
          onClick={() => void comparison.compare(a, b)}
          disabled={comparison.status === "loading" || sameVersion}
          aria-describedby={sameVersion ? SAME_VERSION_HINT_ID : undefined}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {copy.compare}
        </button>
      </div>

      {sameVersion && (
        <p id={SAME_VERSION_HINT_ID} className="text-xs text-slate-500">
          {copy.same}
        </p>
      )}

      {comparison.status === "loading" && <LoadingState label={copy.loading} />}
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
