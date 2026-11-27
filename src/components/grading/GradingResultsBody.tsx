import Link from "next/link";
import type { ReactNode } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type { AsyncResource } from "@/hooks/useAsyncResource";
import { formatWib } from "@/lib/datetime/formatWib";
import { resultJudgeText } from "@/lib/grading/gradingRules";
import { versionText } from "@/lib/rubrics/gradingRun";
import type { SessionGradingResponse } from "@/types/grading";
import { SessionScoreSummary } from "./SessionScoreSummary";
import { SessionScoreTable } from "./SessionScoreTable";

function Meta({ label, children }: Readonly<{ label: string; children: ReactNode }>) {
  return (
    <div>
      <dt className="text-xs text-muted">{label}</dt>
      <dd className="text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

/**
 * Isi hasil penilaian satu sesi dalam empat keadaan: memuat, gagal, belum dinilai, dan hasil.
 * Dipakai bersama oleh halaman detail sesi (dengan tombol Nilai untuk Admin) dan halaman Laporan
 * (tanpa aksi), jadi kedua halaman menampilkan hasil yang sama dengan cara yang sama.
 *
 * SCRUM-375 C4: ringkasannya tiga label, Rubrik, Penilai LLM (K-11) dan Dinilai. Versi rubrik menaut ke
 * daftar rubrik hanya bila rubricHref diberikan, karena Laporan juga dibuka peran yang tidak boleh
 * membuka /admin/rubrics.
 */
export function GradingResultsBody({
  results,
  gradeAction,
  rubricHref,
}: Readonly<{
  results: AsyncResource<SessionGradingResponse | null> & { reload: () => void };
  /** Tombol di keadaan belum dinilai; tidak ada untuk peran yang tidak boleh menilai. */
  gradeAction?: { label: string; onClick: () => void; disabled?: boolean };
  /** Tautan versi rubrik; hanya untuk peran yang boleh membuka daftar rubrik. */
  rubricHref?: string;
}>) {
  if (results.status === "loading") return <LoadingState />;
  if (results.status === "error") return <ErrorState variant="card" message={results.message} onRetry={results.reload} />;
  if (results.data === null) {
    return (
      <EmptyState
        title="Sesi ini belum dinilai."
        description="Hasil tampil di sini setelah Admin menilai sesi ini."
        action={gradeAction}
        className="rounded-control border border-line bg-paper"
      />
    );
  }

  const result = results.data;
  const version = versionText(result.rubric_version);
  return (
    <div className="space-y-5">
      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        <Meta label="Rubrik">
          {rubricHref ? (
            <Link href={rubricHref} className="text-accent-ink underline underline-offset-2">
              {version}
            </Link>
          ) : (
            version
          )}
        </Meta>
        {/* K-11 (SCRUM-291): produk dan model LLM judge yang menilai run ini, di semua halaman hasil. */}
        <Meta label="Penilai LLM">{resultJudgeText(result.judge)}</Meta>
        <Meta label="Dinilai">{formatWib(result.triggered_at)}</Meta>
      </dl>
      <section className="space-y-2">
        <h3 className="font-serif text-lg leading-6 text-ink">Rata-rata skor</h3>
        <SessionScoreSummary scores={result.scores} versionLabel={version} />
      </section>
      <section className="space-y-2">
        <h3 className="font-serif text-lg leading-6 text-ink">Skor per kasus</h3>
        <SessionScoreTable cases={result.cases ?? []} rubricVersion={result.rubric_version} />
        <p className="text-xs text-muted">Klik baris untuk melihat skor tiap percobaan.</p>
      </section>
    </div>
  );
}
