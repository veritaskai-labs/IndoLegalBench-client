import { Badge } from "@/components/ui";
import type { CompletenessState } from "@/hooks/useCaseCompleteness";

type Props = CompletenessState & {
  onRetry: () => void;
  submittable?: boolean;
};

/**
 * Kelengkapan kasus di kepala editor (SCRUM-109, AC4 dan AC7). Angka dan
 * daftar kekurangan datang dari server, jadi rumusnya hanya ada di satu tempat.
 */
export function CompletenessIndicator(props: Props) {
  if (props.status === "loading") {
    return (
      <section
        aria-label="Kelengkapan kasus"
        aria-busy="true"
        className="rounded-control border border-line bg-paper p-4"
      >
        <p role="status" className="text-sm text-muted">
          Menghitung kelengkapan…
        </p>
      </section>
    );
  }

  if (props.status === "error") {
    return (
      <section
        aria-label="Kelengkapan kasus"
        className="rounded-control border border-danger/30 bg-danger-wash p-4"
      >
        <p role="alert" className="text-sm text-danger">
          Gagal memuat kelengkapan kasus.{" "}
          <button
            type="button"
            onClick={props.onRetry}
            className="cursor-pointer font-medium underline"
          >
            Coba lagi
          </button>
        </p>
      </section>
    );
  }

  // Daftar kekurangan tampil apa adanya dari server.
  const { pct, missing, ready_for_review } = props.completeness;

  return (
    <section
      aria-label="Kelengkapan kasus"
      className="space-y-3 rounded-control border border-line bg-paper p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium text-ink">Kelengkapan {pct}%</p>
        {props.submittable !== false && ready_for_review && (
          <Badge tone="green">Siap diajukan review</Badge>
        )}
      </div>

      <div
        role="progressbar"
        aria-label="Kelengkapan kasus"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 overflow-hidden rounded-full bg-surface"
      >
        <div
          className={`h-full transition-all ${ready_for_review ? "bg-success" : "bg-accent"}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {missing.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ink-soft">Belum lengkap:</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted">
            {missing.map(({ field, message }) => (
              <li key={field}>{message}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
