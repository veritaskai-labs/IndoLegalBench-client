import type { CompletenessState } from "@/hooks/useCaseCompleteness";

type Props = CompletenessState & { onRetry: () => void };

/**
 * Kelengkapan kasus di kepala editor (SCRUM-109, AC4 dan AC7). Angka dan
 * daftar kekurangan datang dari server, jadi rumusnya hanya ada di satu tempat.
 */
export function CompletenessIndicator(props: Props) {
  if (props.status === "loading") {
    return (
      <section aria-label="Kelengkapan kasus" aria-busy="true" className="rounded-lg border border-slate-200 bg-white p-4">
        <p role="status" className="text-sm text-slate-500">
          Menghitung kelengkapan…
        </p>
      </section>
    );
  }

  if (props.status === "error") {
    return (
      <section aria-label="Kelengkapan kasus" className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p role="alert" className="text-sm text-red-700">
          Gagal memuat kelengkapan kasus.{" "}
          <button type="button" onClick={props.onRetry} className="font-medium underline">
            Coba lagi
          </button>
        </p>
      </section>
    );
  }

  const { pct, missing, trap_count, ready_for_review } = props.completeness;
  const noTraps = trap_count === 0;
  // Kekurangan jebakan sudah punya peringatannya sendiri di atas daftar.
  const rest = noTraps ? missing.filter(({ field }) => field !== "traps") : missing;

  return (
    <section aria-label="Kelengkapan kasus" className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium text-slate-900">Kelengkapan {pct}%</p>
        {ready_for_review && (
          <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            Siap diajukan review
          </span>
        )}
      </div>

      <div
        role="progressbar"
        aria-label="Kelengkapan kasus"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 overflow-hidden rounded-full bg-slate-200"
      >
        <div
          className={`h-full ${ready_for_review ? "bg-emerald-600" : "bg-slate-900"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {noTraps && (
        <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Jebakan belum ada. Kasus butuh minimal satu jebakan sebelum bisa diajukan review.
        </p>
      )}

      {rest.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-700">Belum lengkap:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-600">
            {rest.map(({ field, message }) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
