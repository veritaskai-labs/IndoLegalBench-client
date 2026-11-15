import { ErrorState } from "@/components/ui/ErrorState";
import type { GradingProgressResource } from "@/hooks/useGradingProgress";
import { canRetryGrading, gradingFailureMessage, isGradingActive } from "@/lib/grading/gradingRules";

const BAR =
  "h-2 w-full appearance-none overflow-hidden rounded-full bg-slate-100 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-indigo-600 [&::-moz-progress-bar]:bg-indigo-600";

/**
 * Progres penilaian di latar belakang (K-13, SCRUM-285): antre, berjalan "X dari N percobaan", atau
 * alasan gagal. Tidak menampilkan apa pun saat memuat, sebelum dinilai, atau setelah selesai: hasil
 * penilaian sudah tampil di tempatnya sendiri. Dipakai halaman sesi otomatis dan manual.
 *
 * Run yang gagal membawa tombol "Coba Nilai Ulang" (K-19, SCRUM-290) bila pemanggil memberi onRetry:
 * pemanggil yang tidak boleh menilai (bukan Admin, sesi diarsipkan) tidak memberinya. Tombol hilang
 * sendiri begitu run baru antre karena tampilan beralih ke progres.
 */
export function GradingProgressBar({
  progress,
  onRetry,
}: Readonly<{ progress: GradingProgressResource; onRetry?: () => void }>) {
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
      <div
        role="alert"
        className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 sm:flex-row sm:items-center sm:justify-between"
      >
        <p>Penilaian terakhir gagal. {gradingFailureMessage(data.error_code)}</p>
        {onRetry && canRetryGrading(data.error_code) && (
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 self-start rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-indigo-700 sm:self-auto"
          >
            Coba Nilai Ulang
          </button>
        )}
      </div>
    );
  }
  return null;
}
