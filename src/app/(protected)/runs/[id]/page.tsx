
"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import { SessionGradingSection } from "@/components/grading/SessionGradingSection";
import { SessionCaseCard } from "@/components/runs/SessionCaseCard";
import { SessionControls } from "@/components/runs/SessionControls";
import { ScoreDownloadButton, gradingOf } from "@/components/runs/ScoreDownloadButton";
import { SessionStatusBadge } from "@/components/runs/SessionStatusBadge";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useSessionDetail } from "@/hooks/useSessionDetail";
import { formatWib } from "@/lib/datetime/formatWib";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";
import { decodeRouteParam } from "@/lib/routeParams";
import { awaitingFirstAnswer, caseFilterLabel, measurementPurposeLabel } from "@/lib/runs/sessionDetail";
import { formatProgress, isSettled, unknownName } from "@/lib/runs/sessionRules";
import type { Role } from "@/types";
import type { SessionDetail } from "@/types/measurement";
import { MeasurementProgressPanel } from "@/components/runs/MeasurementProgressPanel";
import { SessionErrorSummary } from "@/components/runs/SessionErrorSummary";
import { useMeasurementProgress } from "@/hooks/useMeasurementProgress";
import { useSessionResults } from "@/hooks/useSessionResults";
import { failedAttempts } from "@/lib/runs/sessionErrors";

const COPY = messages({
  id: {
    back: "Kembali ke Pengukuran otomatis",
    list: "Pengukuran otomatis",
    status: "Status sesi",
    settings: "Pengaturan",
    product: "Produk",
    purpose: "Tujuan",
    filter: "Filter kasus",
    repetitions: "Pengulangan",
    progress: "Progres",
    snapshot: "Snapshot kasus",
    snapshotPending: "Dibuat saat sesi mulai",
    times: "Waktu",
    created: "Dibuat",
    started: "Mulai berjalan",
    finished: "Berakhir",
    summary: "Ringkasan sesi",
    archived: "Sesi ini sudah diarsipkan dan tidak tampil di daftar. Datanya tetap tersimpan.",
    stale: "Pembaruan otomatis gagal. Menampilkan data terakhir yang berhasil dimuat.",
    progressTitle: "Progres",
    casesTitle: "Kasus dan jawaban mentah",
    waiting: "Belum ada jawaban. Jawaban kasus dev tampil di sini begitu tiap percobaan selesai, halaman diperbarui otomatis.",
    noCases: "Belum ada kasus. Snapshot kasus dibuat saat sesi mulai berjalan.",
  },
  en: {
    back: "Back to Automatic measurement",
    list: "Automatic measurement",
    status: "Session status",
    settings: "Settings",
    product: "Product",
    purpose: "Purpose",
    filter: "Case filter",
    repetitions: "Repetitions",
    progress: "Progress",
    snapshot: "Case snapshot",
    snapshotPending: "Created when the session starts",
    times: "Time",
    created: "Created",
    started: "Started running",
    finished: "Ended",
    summary: "Session summary",
    archived: "This session is archived and does not appear in the list. Its data is still stored.",
    stale: "Automatic refresh failed. Showing the last data that loaded successfully.",
    progressTitle: "Progress",
    casesTitle: "Cases and raw answers",
    waiting: "No answers yet. Dev-case answers appear here as each attempt finishes, and the page refreshes automatically.",
    noCases: "No cases yet. The case snapshot is created when the session starts running.",
  },
});

/** Detail satu sesi pengukuran: snapshot kasus dan jawaban mentah (PBI-11 AC6–AC8, SCRUM-212). */
export default function SessionDetailPage() {
  const copy = useText(COPY);
  const sessionId = decodeRouteParam(useParams<{ id: string }>().id);
  const auth = useAuth();
  const role = auth.status === "authenticated" ? auth.user.role : null;
  const viewerId = auth.status === "authenticated" ? auth.user.id : null;
  const detail = useSessionDetail(sessionId);

  if (detail.status === "loading") return <LoadingState />;

  if (detail.status === "error") {
    return (
      <div className="space-y-4">
        <ErrorState variant="card" message={detail.message} onRetry={detail.reload} />
        <Link href="/runs" className="text-sm font-medium text-slate-900 hover:underline">
          {copy.back}
        </Link>
      </div>
    );
  }

  return <SessionDetailView key={detail.data.id} session={detail.data} role={role} viewerId={viewerId} />;
}

function SessionDetailView({
  session: initialSession,
  role,
  viewerId,
}: Readonly<{ session: SessionDetail; role: Role | null; viewerId: string | null }>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const { session, stale, reload: reloadSession } = useLiveSession(initialSession);
  const results = useSessionResults(session.id);
  // Sesi yang tidak berubah sendiri tidak perlu polling (berakhir atau dibatalkan).
  const ended = isSettled(session.status);
  const progress = useMeasurementProgress(session.id, { poll: !ended });

  const factGroups: { title: string; facts: { label: string; value: React.ReactNode }[] }[] = [
    {
      title: copy.settings,
      facts: [
        { label: copy.product, value: unknownName(session.product_name, locale) },
        { label: copy.purpose, value: measurementPurposeLabel(session.purpose, locale) },
        { label: copy.filter, value: caseFilterLabel(session.split_filter, locale) },
        { label: copy.repetitions, value: session.repetitions },
        { label: copy.progress, value: formatProgress(session, locale) },
        {
          label: copy.snapshot,
          value: session.snapshot_created_at ? formatWib(session.snapshot_created_at) : copy.snapshotPending,
        },
      ],
    },
    {
      title: copy.times,
      facts: [
        { label: copy.created, value: `${formatWib(session.created_at)} · ${unknownName(session.created_by_name, locale)}` },
        { label: copy.started, value: session.started_at ? formatWib(session.started_at) : "—" },
        { label: copy.finished, value: session.finished_at ? formatWib(session.finished_at) : "—" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: copy.list, href: "/runs" }, { label: session.label }]} />
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{session.label}</h1>
          <output aria-label={copy.status}>
            <SessionStatusBadge status={session.status} stopReason={session.stop_reason} />
          </output>
        </div>
        <ScoreDownloadButton session={session} grading={gradingOf(results)} />
      </div>

      {session.archived_at && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {copy.archived}
        </p>
      )}

      <section aria-label={copy.summary} className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
        {factGroups.map((group) => (
          <fieldset key={group.title} className="m-0 min-w-0 space-y-2 border-0 p-0">
            <legend className="p-0 text-xs font-semibold text-muted">{group.title}</legend>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm sm:gap-x-6 lg:grid-cols-3">
              {group.facts.map((fact) => (
                <div key={fact.label}>
                  <dt className="text-xs font-semibold text-slate-500">{fact.label}</dt>
                  <dd className="mt-0.5 text-slate-900">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </fieldset>
        ))}
      </section>

      {stale && !ended && (
        <output className="block rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {copy.stale}
        </output>
      )}

      <SessionControls session={session} role={role} viewerId={viewerId} onChanged={reloadSession} />

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">{copy.progressTitle}</h2>
        {progress.status === "loading" && <LoadingState />}
        {progress.status === "error" && (
          <ErrorState variant="card" message={progress.message} onRetry={progress.reload} />
        )}
        {progress.status === "ready" && <MeasurementProgressPanel progress={progress.data} />}
      </section>

      {/* Komponen ini menghilang sendiri kalau tidak ada panggilan yang gagal (AC4). */}
      <SessionErrorSummary sessionId={session.id} failures={failedAttempts(session.cases)}
      />

      {/* Nilai dan hasil per kasus (PBI-14). Penilaian ulang ada di SCRUM-228. */}
      <SessionGradingSection session={session} role={role} results={results} />

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">{copy.casesTitle}</h2>
        {!ended && awaitingFirstAnswer(session.cases) && (
          <p className="text-sm text-slate-500">
            {copy.waiting}
          </p>
        )}
        {session.cases.length === 0 ? (
          <p className="text-sm text-slate-500">{copy.noCases}</p>
        ) : (
          session.cases.map((item) => <SessionCaseCard key={item.snapshot_item_id} item={item} sessionLabel={session.label} />)
        )}
      </section>
    </div>
  );
}
