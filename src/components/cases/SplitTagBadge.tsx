import { SPLIT_TAG_LABEL } from "@/lib/cases/splitTag";
import type { SplitTag } from "@/types/case";

const TAG_CLASS: Record<SplitTag, string> = {
  dev: "border-sky-200 bg-sky-50 text-sky-800",
  test: "border-violet-200 bg-violet-50 text-violet-800",
};

type Props = {
  tag: SplitTag;
  /** Halaman review: tag hanya informasi, tidak dinilai reviewer (PBI-9 AC2). */
  infoOnly?: boolean;
  /** Kasus pernah ada di dev set (was_dev dari server, PBI-9 AC3). Ditampilkan selama tagnya test. */
  wasDev?: boolean;
};

/** Badge tag dev/test yang sama di editor, daftar kasus, dan halaman review. */
export function SplitTagBadge({ tag, infoOnly = false, wasDev = false }: Props) {
  const label = SPLIT_TAG_LABEL[tag];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        aria-label={infoOnly ? `Tag ${label}, hanya informasi dan tidak dinilai` : undefined}
        className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-medium ${TAG_CLASS[tag]}`}
      >
        {label}
        {infoOnly && <span className="font-normal opacity-80">info saja</span>}
      </span>
      {wasDev && tag === "test" && (
        <span
          title="Kasus ini pernah dipakai sebagai dev set dan sudah terlihat developer AI."
          className="rounded border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-800"
        >
          pernah dev set
        </span>
      )}
    </span>
  );
}
