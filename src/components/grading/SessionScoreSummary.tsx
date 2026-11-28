import { InfoTip } from "@/components/reports/comparison/InfoTip";
import { SCORE_GROUP_LABEL, SCORE_PATH_LABEL, SCORE_PATHS, scoreCells, scoreHelp } from "@/lib/grading/gradingView";
import type { ThreeScores } from "@/types/grading";

const GROUPS = Object.keys(SCORE_GROUP_LABEL) as (keyof ThreeScores)[];

/**
 * Tiga skor sesi yang terpisah, Dev, Test dan Gabungan (PBI-11 AC9), masing-masing dengan skor
 * deterministik, kualitas dan format yang tidak digabung (PBI-14 AC1). Komponen murni: angka sudah
 * dari server, di sini hanya diformat. SCRUM-375 C4: tiap judul kolom punya ikon info (pola InfoTip
 * A1/A6 yang disetujui PO 25 Nov) yang menyebut versi rubrik hasil ini.
 */
export function SessionScoreSummary({ scores, versionLabel }: Readonly<{ scores: ThreeScores; versionLabel: string }>) {
  return (
    <div className="max-w-xl overflow-x-auto rounded-control border border-line bg-paper">
      <table className="w-full border-separate border-spacing-0 text-[13px]">
        <caption className="sr-only">Skor sesi</caption>
        <thead className="bg-surface text-ink-soft">
          <tr>
            {/* Judul kolom Dev/Test/Gabungan: hanya untuk pembaca layar, sudutnya tetap tampak kosong. */}
            <th scope="col" className="px-3 py-2 text-left">
              <span className="sr-only">Kelompok</span>
            </th>
            {SCORE_PATHS.map((path) => (
              <th key={path} scope="col" className="px-3 py-2 text-right font-medium">
                <span className="inline-flex items-center gap-1.5">
                  {SCORE_PATH_LABEL[path]}
                  <InfoTip label={SCORE_PATH_LABEL[path]} text={scoreHelp(path, versionLabel)} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {GROUPS.map((group) => {
            const cells = scoreCells(scores[group]);
            const combined = group === "combined";
            return (
              <tr key={group}>
                <th scope="row" className={`border-t border-line-soft px-3 py-2.5 text-left text-ink ${combined ? "font-semibold" : "font-normal"}`}>
                  {SCORE_GROUP_LABEL[group]}
                </th>
                {SCORE_PATHS.map((path) => (
                  <td key={path} className={`border-t border-line-soft px-3 py-2.5 text-right tabular-nums text-ink ${combined ? "font-semibold" : ""}`}>
                    {cells[path]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
