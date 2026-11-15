import { ErrorState } from "@/components/ui/ErrorState";
import type { GradingProgressResource } from "@/hooks/useGradingProgress";
import { gradingFailureMessage, isGradingActive } from "@/lib/grading/gradingRules";

const BAR =
  "h-2 w-full appearance-none overflow-hidden rounded-full bg-slate-100 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-indigo-600 [&::-moz-progress-bar]:bg-indigo-600";

/**
 * Progres penilaian di latar belakang (K-13, SCRUM-285): antre, berjalan "X dari N percobaan", atau
 * alasan gagal. Tidak menampilkan apa pun saat memuat, sebelum dinilai, atau setelah selesai: hasil
 * penilaian sudah tampil di tempatnya sendiri. Dipakai halaman sesi otomatis dan manual.
 */
export function GradingProgressBar({ progress }: Readonly<{ progress: GradingProgressResource }>) {
  if (progress.status === "error") return <ErrorState message={progress.message} onRetry={progress.reload} />;
  if (progress.status === "loading") return null;

  const data = progress.data;
  if (progress.active) {
    // Baru dibalas 202: bacaan terakhir masih run lama, jadi run baru ditampilkan sebagai antre.
    const current = isGradingActive(data) ? data : null;
    const percent = current?.percent ?? 0;
    const graded = current?.attempts_graded ?? 0;
    const counts = current === null ? "" : ` · ${graded} dari ${current.attempts_total} percobaan (${percent}%)`;
    return (
      <section aria-label="Penilaian berjalan" className="space-y-2 rounded-lg border border-indigo-200 bg-indigo-50 px-4 py-3">
        <p className="text-sm font-medium text-indigo-900">Penilaian berjalan di latar belakang</p>
        <progress value={percent} max={100} aria-label="Progres penilaian" className={BAR} />
        <p className="text-sm text-indigo-900">
          {current?.status === "running"
            ? `${graded} dari ${current.attempts_total} percobaan dinilai (${percent}%)`
            : `Menunggu giliran penilaian${counts}`}
        </p>
      </section>
    );
  }

  if (data?.status === "failed") {
    return (
      <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        Penilaian terakhir gagal. {gradingFailureMessage(data.error_code)}
      </p>
    );
  }
  return null;
}
