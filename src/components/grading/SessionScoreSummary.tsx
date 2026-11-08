import { SCORE_GROUP_LABEL, SCORE_PATH_LABEL, SCORE_PATHS, scoreCells } from "@/lib/grading/gradingView";
import type { ThreeScores } from "@/types/grading";

const GROUPS = Object.keys(SCORE_GROUP_LABEL) as (keyof ThreeScores)[];

/**
 * Tiga skor sesi yang terpisah, Dev, Test dan Gabungan (PBI-11 AC9), masing-masing dengan skor
 * deterministik, kualitas dan format yang tidak digabung (PBI-14 AC1). Komponen murni: angka sudah
 * dari server, di sini hanya diformat.
 */
export function SessionScoreSummary({ scores }: Readonly<{ scores: ThreeScores }>) {
  return (
    <table className="w-full max-w-md text-sm">
      <caption className="sr-only">Skor sesi</caption>
      <thead>
        <tr className="text-left text-xs font-semibold text-slate-500">
          {/* Judul kolom Dev/Test/Gabungan: hanya untuk pembaca layar, sudutnya tetap tampak kosong. */}
          <th scope="col" className="py-2 pr-3">
            <span className="sr-only">Kelompok</span>
          </th>
          {SCORE_PATHS.map((path) => (
            <th key={path} scope="col" className="px-3 py-2 text-right">
              {SCORE_PATH_LABEL[path]}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {GROUPS.map((group) => {
          const cells = scoreCells(scores[group]);
          return (
            <tr key={group}>
              <th scope="row" className="py-2 pr-3 text-left font-medium text-slate-900">
                {SCORE_GROUP_LABEL[group]}
              </th>
              {SCORE_PATHS.map((path) => (
                <td key={path} className="px-3 py-2 text-right tabular-nums text-slate-900">
                  {cells[path]}
                </td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
