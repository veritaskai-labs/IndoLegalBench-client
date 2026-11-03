"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { SessionCaseCard } from "@/components/runs/SessionCaseCard";
import { SessionStatusBadge } from "@/components/runs/SessionStatusBadge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useSessionDetail } from "@/hooks/useSessionDetail";
import { formatWib } from "@/lib/datetime/formatWib";
import { decodeRouteParam } from "@/lib/routeParams";
import { CASE_FILTER_LABEL, MEASUREMENT_PURPOSE_LABEL } from "@/lib/runs/sessionDetail";
import { formatProgress, hasEnded, unknownName } from "@/lib/runs/sessionRules";
import type { Role } from "@/types";
import type { SessionDetail } from "@/types/measurement";

/** Detail satu sesi pengukuran: snapshot kasus dan jawaban mentah (PBI-11 AC6–AC8, SCRUM-212). */
export default function SessionDetailPage() {
  const sessionId = decodeRouteParam(useParams<{ id: string }>().id);
  const auth = useAuth();
  const role = auth.status === "authenticated" ? auth.user.role : null;
  const detail = useSessionDetail(sessionId);

  if (detail.status === "loading") return <LoadingState />;

  if (detail.status === "error") {
    return (
      <div className="space-y-4">
        <ErrorState variant="card" message={detail.message} onRetry={detail.reload} />
        <Link href="/runs" className="text-sm font-medium text-slate-900 hover:underline">
          Kembali ke Eksekusi
        </Link>
      </div>
    );
  }

  return <SessionDetailView session={detail.data} role={role} />;
}

function SessionDetailView({ session, role }: Readonly<{ session: SessionDetail; role: Role | null }>) {
  const facts: { label: string; value: React.ReactNode }[] = [
    { label: "Status", value: <SessionStatusBadge status={session.status} /> },
    { label: "Produk", value: unknownName(session.product_name) },
    { label: "Tujuan", value: MEASUREMENT_PURPOSE_LABEL[session.purpose] },
    { label: "Filter kasus", value: CASE_FILTER_LABEL[session.split_filter] },
    { label: "Pengulangan", value: session.repetitions },
    { label: "Progres", value: formatProgress(session) },
    { label: "Dibuat", value: `${formatWib(session.created_at)} · ${unknownName(session.created_by_name)}` },
    { label: "Mulai berjalan", value: session.started_at ? formatWib(session.started_at) : "–" },
    { label: "Berakhir", value: session.finished_at ? formatWib(session.finished_at) : "–" },
    {
      label: "Snapshot kasus",
      value: session.snapshot_created_at ? formatWib(session.snapshot_created_at) : "Dibuat saat sesi mulai",
    },
  ];
  // Developer AI melihat jawaban hanya setelah sesi berakhir (server#91 session_detail).
  const context = { sessionEnded: hasEnded(session.status), viewerRole: role };

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Eksekusi", href: "/runs" }, { label: session.label }]} />
      <h1 className="text-xl font-semibold text-slate-900">{session.label}</h1>

      {session.archived_at && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Sesi ini sudah diarsipkan dan tidak tampil di daftar. Datanya tetap tersimpan.
        </p>
      )}

      <section aria-label="Ringkasan sesi" className="rounded-lg border border-slate-200 bg-white p-4">
        <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {facts.map((fact) => (
            <div key={fact.label}>
              <dt className="text-xs font-semibold text-slate-500">{fact.label}</dt>
              <dd className="mt-0.5 text-slate-900">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Kasus dan jawaban mentah</h2>
        {session.cases.length === 0 ? (
          <p className="text-sm text-slate-500">Belum ada kasus. Snapshot kasus dibuat saat sesi mulai berjalan.</p>
        ) : (
          session.cases.map((item) => <SessionCaseCard key={item.snapshot_item_id} item={item} context={context} />)
        )}
      </section>
    </div>
  );
}
