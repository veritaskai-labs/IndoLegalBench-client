"use client";

import { splitTagLabel } from "@/lib/cases/splitTag";
import { fill, messages } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import type { SplitTag } from "@/types/case";

const COPY = messages({
  id: {
    unset: "Belum ditetapkan",
    infoOnly: "info saja",
    infoLabel: "Tag {label}, hanya informasi dan tidak dinilai",
    wasDevTitle: "Isi kasus ini pernah terlihat oleh Developer AI.",
    wasDev: "pernah dev set",
  },
  en: {
    unset: "Not set",
    infoOnly: "info only",
    infoLabel: "Tag {label}, information only and not scored",
    wasDevTitle: "The contents of this case were once seen by an AI developer.",
    wasDev: "former dev set",
  },
});

const TAG_CLASS: Record<SplitTag, string> = {
  dev: "border-sky-200 bg-sky-50 text-sky-800",
  test: "border-violet-200 bg-violet-50 text-violet-800",
};

type Props = {
  tag: SplitTag | null;
  /** Halaman review: tag hanya informasi, tidak dinilai reviewer (PBI-9 AC2). */
  infoOnly?: boolean;
  /** Kasus pernah ada di dev set (was_dev dari server, PBI-9 AC3). Ditampilkan selama tagnya test. */
  wasDev?: boolean;
};

/** Badge tag dev/test yang sama di editor, daftar kasus, dan halaman review. */
export function SplitTagBadge({ tag, infoOnly = false, wasDev = false }: Readonly<Props>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const label = tag === null ? copy.unset : splitTagLabel(tag, locale);
  const style = tag === null ? "border-amber-200 bg-amber-50 text-amber-800" : TAG_CLASS[tag];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-label={infoOnly ? fill(copy.infoLabel, { label }) : undefined}
        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium ${style}`}
      >
        {label}
        {infoOnly && <span className="font-normal opacity-80">{copy.infoOnly}</span>}
      </span>
      {wasDev && tag !== "dev" && (
        <span
          title={copy.wasDevTitle}
          className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800"
        >
          {copy.wasDev}
        </span>
      )}
    </span>
  );
}
