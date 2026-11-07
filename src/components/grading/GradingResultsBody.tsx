import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type { AsyncResource } from "@/hooks/useAsyncResource";
import { formatWib } from "@/lib/datetime/formatWib";
import type { SessionGradingResponse } from "@/types/grading";
import { SessionScoreSummary } from "./SessionScoreSummary";
import { SessionScoreTable } from "./SessionScoreTable";

/**
 * Isi hasil penilaian satu sesi dalam empat keadaan: memuat, gagal, belum dinilai, dan hasil.
 * Dipakai bersama oleh halaman detail sesi (dengan tombol Nilai untuk Admin) dan halaman Laporan
 * (tanpa aksi), jadi kedua halaman menampilkan hasil yang sama dengan cara yang sama.
 */
export function GradingResultsBody({
  results,
  gradeAction,
}: Readonly<{
  results: AsyncResource<SessionGradingResponse | null> & { reload: () => void };
  /** Tombol di keadaan belum dinilai; tidak ada untuk peran yang tidak boleh menilai. */
  gradeAction?: { label: string; onClick: () => void };
}>) {
  if (results.status === "loading") return <LoadingState />;
  if (results.status === "error") return <ErrorState variant="card" message={results.message} onRetry={results.reload} />;
  if (results.data === null) {
    return (
      <EmptyState
        title="Sesi ini belum dinilai."
        description="Hasil tampil di sini setelah Admin menilai sesi ini."
        action={gradeAction}
        className="rounded-lg border border-slate-200 bg-white"
      />
    );
  }

  const result = results.data;
  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Versi rubrik {result.rubric_version} · Dinilai {formatWib(result.triggered_at)}
      </p>
      <SessionScoreSummary scores={result.scores} />
      <SessionScoreTable cases={result.cases ?? []} rubricVersion={result.rubric_version} />
    </div>
  );
}
