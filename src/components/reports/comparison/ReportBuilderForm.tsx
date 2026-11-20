"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useReportBuilder, type ReportBuilder } from "@/hooks/useReportBuilder";
import { REPORT_TITLE_MAX, type TitleProblem } from "@/lib/reports/builder/builderRules";
import type { CreateOutcome, ForbiddenCode } from "@/lib/reports/builder/createOutcome";
import { reasonText } from "@/lib/reports/builder/reasonText";
import { SCORE_SCOPE_LABEL } from "@/lib/reports/reportRules";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";
import type { EligibleSession, MeasurementFilter, ProductLabelMode } from "@/types/reports";

const FILTER_OPTIONS: ReadonlyArray<readonly [MeasurementFilter, string]> = [
  ["all", "Semua"],
  ["automatic", "Otomatis"],
  ["manual", "Manual"],
];

const KIND_LABEL: Readonly<Record<EligibleSession["session_type"], string>> = {
  automatic: "Otomatis",
  manual: "Manual",
};

const LABEL_OPTIONS: ReadonlyArray<readonly [ProductLabelMode, string]> = [
  ["real_name", "Nama asli"],
  ["code", "Kode produk"],
];

const TITLE_TEXT: Readonly<Record<TitleProblem, string>> = {
  TITLE_REQUIRED: "Isi judul laporan.",
  TITLE_TOO_LONG: `Judul paling panjang ${REPORT_TITLE_MAX} karakter.`,
};

const FORBIDDEN_TEXT: Readonly<Record<ForbiddenCode, string>> = {
  REPORT_SCOPE_FORBIDDEN: "Peran Anda tidak boleh membuat laporan dengan jenis nilai ini. Pilih Test.",
  REPORT_LABEL_MODE_FORBIDDEN: "Hanya Admin yang boleh memakai kode produk sebagai label. Pilih nama asli.",
};

const FAILED = "Laporan gagal dibuat. Coba lagi.";
const MISSING_ROW = "Sesi ini sudah tidak tersedia.";

const sessionName = (s: EligibleSession) => `${s.product_name} · ${s.label}`;

const CARD = "space-y-3 rounded-lg border border-slate-200 bg-white p-4";
const LEGEND = "text-sm font-semibold text-slate-900";
const NOTE = "text-sm text-amber-800";

function Badge({ children, tone }: Readonly<{ children: string; tone: "slate" | "amber" }>) {
  const colors = tone === "amber" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors}`}>{children}</span>;
}

function RadioGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: Readonly<{
  legend: string;
  name: string;
  options: ReadonlyArray<readonly [T, string]>;
  value: T;
  onChange: (value: T) => void;
}>) {
  return (
    <fieldset className="space-y-2">
      <legend className={LEGEND}>{legend}</legend>
      <div className="flex flex-wrap gap-4">
        {options.map(([option, text]) => (
          <label key={option} className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="radio"
              name={name}
              value={option}
              checked={value === option}
              onChange={() => onChange(option)}
            />
            {text}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SessionPicker({ builder }: Readonly<{ builder: ReportBuilder }>) {
  const pickedIds = new Set([...builder.picked, ...builder.dropped].map((s) => s.session_id));
  return (
    <fieldset className="space-y-2">
      <legend className={LEGEND}>Sesi</legend>
      <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
        {builder.visibleSessions.map((session) => (
          <li key={session.session_id} className="space-y-1 px-3 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-2 text-sm font-medium text-slate-900">
                <input
                  type="checkbox"
                  checked={pickedIds.has(session.session_id)}
                  disabled={!session.eligible}
                  onChange={() => builder.toggle(session)}
                />
                {sessionName(session)}
              </label>
              <Badge tone="slate">{KIND_LABEL[session.session_type]}</Badge>
              {session.purpose === "trial" && <Badge tone="amber">Uji Coba</Badge>}
            </div>
            {session.reasons.map((reason) => (
              <p key={reason.code} className="pl-6 text-sm text-red-700">
                {reason.message}
              </p>
            ))}
          </li>
        ))}
      </ul>
    </fieldset>
  );
}

/** Reasons the last Create gave for one picked session (409 ineligible, 404 missing). */
function sessionProblems(outcome: CreateOutcome | null, sessionId: string): string[] {
  if (outcome?.kind === "not_comparable") return (outcome.ineligible[sessionId] ?? []).map(reasonText);
  if (outcome?.kind === "sessions_missing" && outcome.sessionIds.includes(sessionId)) return [MISSING_ROW];
  return [];
}

function PickedList({ builder }: Readonly<{ builder: ReportBuilder }>) {
  const rows = [...builder.picked, ...builder.dropped];
  if (rows.length === 0) return null;
  return (
    <ul aria-label="Sesi terpilih" className="space-y-1">
      {rows.map((session) => (
        <li key={session.session_id} className="rounded-md bg-slate-50 px-3 py-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-slate-900">{sessionName(session)}</span>
            <button
              type="button"
              className="text-indigo-700 hover:underline"
              onClick={() => builder.toggle(session)}
            >
              Lepas <span className="sr-only">{sessionName(session)}</span>
            </button>
          </div>
          {sessionProblems(builder.outcome, session.session_id).map((text) => (
            <p key={text} className="text-red-700">
              {text}
            </p>
          ))}
        </li>
      ))}
    </ul>
  );
}

function OutcomeMessage({ outcome, onReload }: Readonly<{ outcome: CreateOutcome; onReload: () => void }>) {
  if (outcome.kind === "saved") {
    return <p role="status" className="text-sm text-green-800">Laporan tersimpan. Membuka laporan…</p>;
  }
  const box = "space-y-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800";
  switch (outcome.kind) {
    case "no_shared_cases":
      return (
        <div role="alert" className={box}>
          Sesi yang dipilih tidak punya kasus uji yang sama, jadi tidak ada yang bisa dibandingkan. Laporan tidak
          disimpan. Pilih sesi lain.
        </div>
      );
    case "not_comparable": {
      const lines = [
        ...outcome.selectionErrors.map(reasonText),
        ...outcome.rejections.map((r) => r.message),
        ...(Object.keys(outcome.ineligible).length > 0
          ? ["Sebagian sesi belum memenuhi syarat. Alasannya ada di daftar Sesi terpilih."]
          : []),
      ];
      return (
        <div role="alert" className={box}>
          <p className="font-semibold">Laporan belum bisa dibuat.</p>
          <ul className="list-disc pl-5">
            {lines.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      );
    }
    case "sessions_missing":
      return (
        <div role="alert" className={box}>
          <p>
            Sebagian sesi sudah tidak tersedia (dihapus atau diarsipkan setelah daftar dimuat). Lepas sesi yang
            ditandai, lalu muat ulang daftar.
          </p>
          <button type="button" className="font-semibold underline" onClick={onReload}>
            Muat ulang daftar
          </button>
        </div>
      );
    case "forbidden":
      return (
        <div role="alert" className={box}>
          {FORBIDDEN_TEXT[outcome.code]}
        </div>
      );
    case "invalid":
      return (
        <div role="alert" className={box}>
          {outcome.message ?? "Isian belum lengkap. Periksa judul dan sesi yang dipilih."}
        </div>
      );
    case "failed":
      return (
        <div role="alert" className={box}>
          {outcome.message ?? FAILED}
        </div>
      );
  }
}

function BuilderForm({ builder }: Readonly<{ builder: ReportBuilder }>) {
  const [titleTouched, setTitleTouched] = useState(false);
  const titleText =
    builder.titleProblem === "TITLE_TOO_LONG" || (builder.titleProblem !== null && titleTouched)
      ? TITLE_TEXT[builder.titleProblem]
      : null;

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void builder.submit();
      }}
    >
      <div className={CARD}>
        <label className="block space-y-1">
          <span className={LEGEND}>Judul laporan</span>
          <input
            type="text"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            value={builder.title}
            onChange={(event) => builder.setTitle(event.target.value)}
            onBlur={() => setTitleTouched(true)}
          />
        </label>
        {titleText && <p className="text-sm text-red-700">{titleText}</p>}
      </div>

      <div className={CARD}>
        <RadioGroup
          legend="Jenis pengukuran"
          name="measurement-filter"
          options={FILTER_OPTIONS}
          value={builder.filter}
          onChange={builder.setFilter}
        />
        <SessionPicker builder={builder} />
        <PickedList builder={builder} />
        {builder.dropped.length > 0 && (
          <p className={NOTE}>
            {`${builder.dropped.length} sesi terpilih tidak ikut karena filter: ${builder.dropped.map(sessionName).join(", ")}.`}
          </p>
        )}
        {builder.selectionProblems.map((problem) => (
          <p key={problem} className="text-sm text-slate-600">
            {reasonText(problem)}
          </p>
        ))}
        {builder.judgeWarning && (
          <p className={NOTE}>
            Sesi terpilih dinilai oleh LLM judge yang berbeda, jadi perbandingan kemungkinan ditolak. Pilih sesi dengan
            judge yang sama.
          </p>
        )}
      </div>

      <div className={CARD}>
        <RadioGroup
          legend="Jenis nilai"
          name="score-scope"
          options={builder.scoreScopes.map((scope) => [scope, SCORE_SCOPE_LABEL[scope]] as const)}
          value={builder.scoreScope}
          onChange={builder.setScoreScope}
        />
        {builder.canChooseLabel && (
          <RadioGroup
            legend="Label produk"
            name="product-label"
            options={LABEL_OPTIONS}
            value={builder.productLabelMode}
            onChange={builder.setProductLabelMode}
          />
        )}
      </div>

      {builder.outcome && <OutcomeMessage outcome={builder.outcome} onReload={builder.sessions.reload} />}

      <button
        type="submit"
        disabled={!builder.canSubmit}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
      >
        {builder.submitting ? "Membuat laporan…" : "Buat laporan"}
      </button>
    </form>
  );
}

/**
 * Halaman pembuat laporan perbandingan (SCRUM-321, PBI-15). Aturan dan state ada di useReportBuilder dan
 * lib/reports/builder; komponen ini hanya menampilkan. Opsi yang tidak boleh untuk peran ini disembunyikan,
 * tapi server tetap penjaganya (403 tetap ditampilkan dengan kalimat biasa).
 */
export function ReportBuilderForm({ gateway = httpReportsGateway }: Readonly<{ gateway?: ReportsGateway }>) {
  const auth = useAuth();
  const role = auth.status === "authenticated" ? auth.user.role : null;
  const builder = useReportBuilder(role, gateway);
  const router = useRouter();
  const savedId = builder.outcome?.kind === "saved" ? builder.outcome.reportId : null;

  useEffect(() => {
    if (savedId !== null) router.push(`/reports/comparisons/${encodeURIComponent(savedId)}`);
  }, [savedId, router]);

  const { sessions } = builder;
  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: "Laporan", href: "/reports" },
          { label: "Laporan perbandingan", href: "/reports/comparisons" },
          { label: "Buat laporan" },
        ]}
      />
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Buat laporan perbandingan</h1>
        <p className="text-sm text-slate-600">
          Pilih satu sesi untuk setiap produk yang ingin dibandingkan. Laporan langsung tersimpan saat dibuat.
        </p>
      </div>
      {/* Peran belum diketahui berarti belum ada jenis nilai yang boleh ditawarkan (allowedScoreScopes). */}
      {role === null && <LoadingState label="Memuat akun Anda…" />}
      {role !== null && sessions.status === "loading" && <LoadingState label="Memuat daftar sesi…" />}
      {sessions.status === "error" && <ErrorState variant="card" message={sessions.message} onRetry={sessions.reload} />}
      {role !== null &&
        sessions.status === "ready" &&
        (sessions.data.length === 0 ? (
          <EmptyState
            title="Belum ada sesi yang bisa dipilih"
            description="Laporan dibuat dari sesi pengukuran. Sesi akan muncul di sini setelah ada yang dijalankan."
          />
        ) : (
          <BuilderForm builder={builder} />
        ))}
    </div>
  );
}
