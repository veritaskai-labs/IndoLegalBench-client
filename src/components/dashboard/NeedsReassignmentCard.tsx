import Link from "next/link";

/** Hanya Admin: kasus yang kehilangan reviewer, dengan jalan pintas ke halaman penugasan ulang. */
export function NeedsReassignmentCard({
  count,
}: Readonly<{ count: number }>) {
  return (
    <section
      aria-labelledby="penugasan-ulang"
      className="rounded-lg border border-slate-200 bg-white p-4"
    >
      <h2
        id="penugasan-ulang"
        className="text-sm font-semibold uppercase tracking-wide text-slate-500"
      >
        Perlu penugasan ulang
      </h2>
      <p className="mt-1 text-3xl font-semibold tabular-nums text-slate-900">
        {count}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        Kasus yang reviewernya nonaktif atau perlu diganti.
      </p>
      <Link
        href="/admin/reviews"
        className="mt-2 inline-block text-sm font-medium text-sky-700 underline"
      >
        Buka halaman penugasan ulang
      </Link>
    </section>
  );
}