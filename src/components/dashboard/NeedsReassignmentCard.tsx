import Link from "next/link";
import { useId } from "react";

import { InfoTip } from "@/components/dashboard/InfoTip";
import { Icon } from "@/components/ui/Icon";

/** Hanya Admin: kasus yang kehilangan reviewer, dengan jalan pintas ke halaman penugasan ulang. */
export function NeedsReassignmentCard({
  count,
}: Readonly<{ count: number }>) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className="flex flex-wrap items-center justify-between gap-3 rounded-control bg-[#fff4ee] p-4"
    >
      <div>
        <div className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-2.5 rounded-xs bg-[#ff6a1f]" />
          <h3 id={headingId} className="text-sm font-normal text-ink">
            Perlu penugasan ulang
          </h3>
          <InfoTip tone="orange" text="Reviewernya nonaktif atau perlu diganti." />
        </div>
        <p className="mt-1 flex items-baseline gap-2">
          <span className="font-serif text-3xl leading-8 text-ink tabular-nums">{count}</span>
          <span className="text-xs text-muted">kasus</span>
        </p>
      </div>
      <Link
        href="/admin/reviews"
        className="inline-flex h-8 items-center gap-1.5 rounded-control bg-accent px-3 text-[13px] text-paper transition-colors hover:bg-accent-hover"
      >
        Buka penugasan ulang
        <Icon name="panahKanan" size={14} />
      </Link>
    </section>
  );
}
