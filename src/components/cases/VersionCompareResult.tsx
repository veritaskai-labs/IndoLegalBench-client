import { SECTION_KEYS, sectionLabel, sectionLines } from "@/lib/cases/versionSections";
import { formatWib } from "@/lib/datetime/formatWib";
import type { VersionCompare, VersionSide } from "@/types/caseVersion";
import { CaseStatusBadge } from "./CaseStatusBadge";

function SideHeading({ side }: { side: VersionSide }) {
  return (
    <th scope="col" className="px-4 py-3 align-top font-semibold text-slate-800">
      <span className="block">Versi {side.version_no}</span>
      <span className="mt-1 flex flex-wrap items-center gap-2 font-normal text-slate-600">
        <CaseStatusBadge status={side.status} />
        <span>{side.author.name}</span>
        <span className="whitespace-nowrap">{formatWib(side.created_at)}</span>
      </span>
    </th>
  );
}

function SectionCell({ lines }: { lines: string[] }) {
  if (lines.length === 0) return <td className="px-4 py-3 align-top text-slate-400">—</td>;
  return (
    <td className="px-4 py-3 align-top text-slate-800">
      {lines.map((line, index) => (
        <p key={index} className="whitespace-pre-wrap">
          {line}
        </p>
      ))}
    </td>
  );
}

/** Dua versi berdampingan. Bagian yang berubah diberi warna dan tulisan "Berubah", bukan warna saja. */
export function VersionCompareResult({ result }: { result: VersionCompare }) {
  return (
    <div className="space-y-3">
      {result.changed.length === 0 && (
        <p role="status" className="rounded border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-700">
          Tidak ada bagian yang berubah di antara kedua versi.
        </p>
      )}

      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left text-xs">
          <caption className="sr-only">Perbandingan dua versi kasus</caption>
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th scope="col" className="px-4 py-3 font-semibold text-slate-700">Bagian</th>
              <SideHeading side={result.a} />
              <SideHeading side={result.b} />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {SECTION_KEYS.map((key) => {
              const changed = result.changed.includes(key);
              return (
                <tr
                  key={key}
                  data-changed={changed}
                  className={changed ? "bg-amber-50" : undefined}
                >
                  <th scope="row" className="px-4 py-3 align-top font-medium text-slate-700">
                    <span className="block">{sectionLabel(key)}</span>
                    {changed && (
                      <span className="mt-1 inline-block rounded border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900">
                        Berubah
                      </span>
                    )}
                  </th>
                  <SectionCell lines={sectionLines(key, result.a.sections)} />
                  <SectionCell lines={sectionLines(key, result.b.sections)} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
