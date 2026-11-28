"use client";

import { Badge } from "@/components/ui";
import type { CompletenessState } from "@/hooks/useCaseCompleteness";
import { CHROME } from "@/lib/i18n/chrome";
import { fill, messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";

const COPY = messages({
  id: {
    region: "Kelengkapan kasus",
    calculating: "Menghitung kelengkapan…",
    failed: "Gagal memuat kelengkapan kasus.",
    percent: "Kelengkapan {pct}%",
    ready: "Siap diajukan review",
    missing: "Belum lengkap:",
  },
  en: {
    region: "Case completeness",
    calculating: "Calculating completeness…",
    failed: "Could not load the case completeness.",
    percent: "Completeness {pct}%",
    ready: "Ready for review",
    missing: "Still missing:",
  },
});

type Props = CompletenessState & {
  onRetry: () => void;
  submittable?: boolean;
};

/**
 * Kelengkapan kasus di kepala editor (SCRUM-109, AC4 dan AC7). Angka dan
 * daftar kekurangan datang dari server, jadi rumusnya hanya ada di satu tempat.
 */
export function CompletenessIndicator(props: Readonly<Props>) {
  const copy = useText(COPY);
  const chrome = useText(CHROME);
  if (props.status === "loading") {
    return (
      <section
        aria-label={copy.region}
        aria-busy="true"
        className="rounded-control border border-line bg-paper p-4"
      >
        <output className="block text-sm text-muted">
          {copy.calculating}
        </output>
      </section>
    );
  }

  if (props.status === "error") {
    return (
      <section
        aria-label={copy.region}
        className="rounded-control border border-danger/30 bg-danger-wash p-4"
      >
        <p role="alert" className="text-sm text-danger">
          {copy.failed}{" "}
          <button
            type="button"
            onClick={props.onRetry}
            className="cursor-pointer font-medium underline"
          >
            {chrome.retry}
          </button>
        </p>
      </section>
    );
  }

  // Daftar kekurangan tampil apa adanya dari server.
  const { pct, missing, ready_for_review } = props.completeness;

  return (
    <section
      aria-label={copy.region}
      className="space-y-3 rounded-control border border-line bg-paper p-4"
    >
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm font-medium text-ink">{fill(copy.percent, { pct })}</p>
        {props.submittable !== false && ready_for_review && (
          <Badge tone="green">{copy.ready}</Badge>
        )}
      </div>

      <progress
        value={pct}
        max={100}
        aria-label={copy.region}
        aria-valuenow={pct}
        className={`block h-2 w-full appearance-none overflow-hidden rounded-full bg-surface [&::-webkit-progress-bar]:bg-surface [&::-moz-progress-bar]:transition-all [&::-webkit-progress-value]:transition-all ${
          ready_for_review
            ? "[&::-moz-progress-bar]:bg-success [&::-webkit-progress-value]:bg-success"
            : "[&::-moz-progress-bar]:bg-accent [&::-webkit-progress-value]:bg-accent"
        }`}
      />

      {missing.length > 0 && (
        <div>
          <p className="text-xs font-medium text-ink-soft">{copy.missing}</p>
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
