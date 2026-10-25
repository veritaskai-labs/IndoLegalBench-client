import {
  COMPARE_SECTION_KEYS,
  changeSummary,
  markedSectionLines,
  type MarkedLine,
} from "@/lib/cases/versionCompare";
import { sectionLabel } from "@/lib/cases/versionSections";
import { formatWib } from "@/lib/datetime/formatWib";
import type { VersionCompare, VersionSide } from "@/types/caseVersion";
import { CaseStatusBadge } from "./CaseStatusBadge";

function SideHeading({ side }: { side: VersionSide }) {
  return (
    <th scope="col" className="min-w-72 px-4 py-3 align-top font-semibold text-slate-800">
      <span className="block">Versi {side.version_no}</span>
      <span className="mt-1 flex flex-wrap items-center gap-2 font-normal text-slate-600">
        <CaseStatusBadge status={side.status} />
        <span>{side.author.name}</span>
        <span className="whitespace-nowrap">{formatWib(side.created_at)}</span>
      </span>
    </th>
  );
}

/** Baris yang hanya ada di satu versi diberi tulisan "Hanya di Versi N", bukan warna saja. */
function SectionCell({ lines, versionNo }: { lines: MarkedLine[]; versionNo: number }) {
  if (lines.length === 0) return <td className="px-4 py-3 align-top text-slate-400">—</td>;
  return (
    <td className="px-4 py-3 align-top text-slate-800">
      {lines.map((line, index) => (
        <p
          key={index}
          data-mark={line.mark}
          className={
            line.mark === "both"
              ? "whitespace-pre-wrap"
              : "my-0.5 whitespace-pre-wrap rounded border-l-4 border-amber-500 bg-amber-100 px-2 py-1"
          }
        >
          {line.mark !== "both" && (
            <span className="mr-1 text-[11px] font-semibold text-amber-900">Hanya di Versi {versionNo}:</span>
          )}
          {line.text}
        </p>
      ))}
    </td>
  );
}

/**
 * Dua versi berdampingan. Ringkasan di atas menyebut bagian yang berubah. Di bagian yang berubah,
 * baris yang hanya ada di satu versi ditandai. Tabel bisa digeser ke samping di layar sempit dan
 * kolom "Bagian" tetap terlihat.
 */
export function VersionCompareResult({ result }: { result: VersionCompare }) {
  return (
    <div className="space-y-3">
      <p role="status" className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
        {changeSummary(result.changed)}
      </p>

      <div
        role="region"
        aria-label="Tabel perbandingan versi, bisa digeser ke samping"
        tabIndex={0}
        className="overflow-x-auto rounded border border-slate-200 bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
      >
        <table className="w-full min-w-[44rem] border-collapse text-left text-xs">
          <caption className="sr-only">Perbandingan dua versi kasus</caption>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th scope="col" className="sticky left-0 z-10 w-36 bg-slate-50 px-4 py-3 font-semibold text-slate-700">
                Bagian
              </th>
              <SideHeading side={result.a} />
              <SideHeading side={result.b} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {COMPARE_SECTION_KEYS.map((key) => {
              const changed = result.changed.includes(key);
              const marked = markedSectionLines(key, result);
              return (
                <tr key={key} data-changed={changed} className={changed ? "bg-amber-50" : undefined}>
                  <th
                    scope="row"
                    className={`sticky left-0 z-10 w-36 px-4 py-3 align-top font-medium text-slate-700 ${
                      changed ? "bg-amber-50" : "bg-white"
                    }`}
                  >
                    <span className="block">{sectionLabel(key)}</span>
                    {changed && (
                      <span className="mt-1 inline-block rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">
                        Berubah
                      </span>
                    )}
                  </th>
                  <SectionCell lines={marked.a} versionNo={result.a.version_no} />
                  <SectionCell lines={marked.b} versionNo={result.b.version_no} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
