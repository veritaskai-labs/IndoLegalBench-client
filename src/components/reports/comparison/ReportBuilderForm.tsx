"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { tabElementId, tabPanelId, Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/hooks/useAuth";
import { useReportBuilder, type ReportBuilder } from "@/hooks/useReportBuilder";
import { REPORT_TITLE_MAX, type TitleProblem } from "@/lib/reports/builder/builderRules";
import type { CreateOutcome, ForbiddenCode } from "@/lib/reports/builder/createOutcome";
import { reasonText } from "@/lib/reports/builder/reasonText";
import type { SessionTab } from "@/lib/reports/builder/sessionSearch";
import type { ScopeOption } from "@/lib/reports/builder/validationView";
import { LABEL_MODE_TEXT } from "@/lib/reports/labelPreview";
import { SCORE_SCOPE_LABEL } from "@/lib/reports/reportRules";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";
import type { EligibleSession, MeasurementFilter, ProductLabelMode } from "@/types/reports";

import { ProductLabelPreview } from "./ProductLabelPreview";
import { ValidationPanel } from "./ValidationPanel";

const FILTER_OPTIONS: ReadonlyArray<readonly [MeasurementFilter, string]> = [
  ["all", "Semua"],
  ["automatic", "Otomatis"],
  ["manual", "Manual"],
];

const KIND_LABEL: Readonly<Record<EligibleSession["session_type"], string>> = {
  automatic: "Otomatis",
  manual: "Manual",
};

const LABEL_OPTIONS: ReadonlyArray<RadioOption<ProductLabelMode>> = (["real_name", "code"] as const).map(
  (mode) => ({ value: mode, label: LABEL_MODE_TEXT[mode].label, reason: LABEL_MODE_TEXT[mode].help }),
);

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

const SESSION_TABS = "report-builder-sessions";
const SESSION_TAB_ORDER: readonly SessionTab[] = ["valid", "invalid"];
const TAB_LABEL: Readonly<Record<SessionTab, string>> = { valid: "Valid", invalid: "Tidak valid" };

/** Tab kosong tanpa pencarian: tab Valid kosong berarti belum ada sesi yang bisa dipilih dengan filter ini. */
const EMPTY_TAB_TEXT: Readonly<Record<SessionTab, string>> = {
  valid: "Belum ada sesi valid untuk jenis pengukuran ini.",
  invalid: "Tidak ada sesi yang tidak valid.",
};

const CARD = "space-y-3 rounded-lg border border-slate-200 bg-white p-4";
const LEGEND = "text-sm font-semibold text-slate-900";
const NOTE = "text-sm text-amber-800";

function Badge({ children, tone }: Readonly<{ children: string; tone: "slate" | "amber" }>) {
  const colors = tone === "amber" ? "bg-amber-100 text-amber-900" : "bg-slate-100 text-slate-700";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${colors}`}>{children}</span>;
}

interface RadioOption<T extends string> {
  value: T;
  label: string;
  disabled?: boolean;
  /** Keterangan untuk opsi yang nonaktif; dibacakan sebagai deskripsi radio. */
  reason?: string | null;
}

const plain = <T extends string>(options: ReadonlyArray<readonly [T, string]>): RadioOption<T>[] =>
  options.map(([value, label]) => ({ value, label }));

function RadioGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: Readonly<{
  legend: string;
  name: string;
  options: ReadonlyArray<RadioOption<T>>;
  value: T;
  onChange: (value: T) => void;
}>) {
  return (
    <fieldset className="space-y-2">
      <legend className={LEGEND}>{legend}</legend>
      <div className="flex flex-wrap gap-4">
        {options.map((option) => {
          const reasonId = `${name}-${option.value}-reason`;
          return (
            <div key={option.value} className="space-y-0.5">
              <label
                className={`flex items-center gap-2 text-sm ${option.disabled ? "text-slate-400" : "text-slate-800"}`}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={value === option.value}
                  disabled={option.disabled}
                  aria-describedby={option.reason ? reasonId : undefined}
                  onChange={() => onChange(option.value)}
                />
                {option.label}
              </label>
              {option.reason && (
                <p id={reasonId} className="pl-6 text-xs text-slate-500">
                  {option.reason}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </fieldset>
  );
}

const scopeRadio = (option: ScopeOption): RadioOption<ScopeOption["scope"]> => ({
  value: option.scope,
  label: SCORE_SCOPE_LABEL[option.scope],
  disabled: option.disabled,
  reason: option.reason,
});

/** Dropdown filter produk (SCRUM-365): bisa memilih lebih dari satu; tidak memilih apa pun berarti semua produk. */
function ProductFilter({ builder }: Readonly<{ builder: ReportBuilder }>) {
  const chosen = builder.productIds.length;
  return (
    <details className="relative">
      <summary className="cursor-pointer rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-800">
        {chosen === 0 ? "Produk: semua" : `Produk: ${chosen} dipilih`}
      </summary>
      <fieldset className="absolute right-0 z-10 mt-1 max-h-64 w-64 space-y-1 overflow-y-auto rounded-md border border-slate-200 bg-white p-3 shadow-md">
        <legend className="sr-only">Filter produk</legend>
        {builder.productOptions.map((product) => (
          <label key={product.id} className="flex items-center gap-2 text-sm text-slate-800">
            <input
              type="checkbox"
              checked={builder.productIds.includes(product.id)}
              onChange={() => builder.toggleProduct(product.id)}
            />
            {product.name}
          </label>
        ))}
      </fieldset>
    </details>
  );
}

/**
 * Isi tab yang kosong. Dengan pencarian atau filter produk aktif, jelaskan bahwa tidak ada yang cocok, sebut bila
 * tab lain punya hasil, dan beri jalan untuk menghapus pencarian (state empty SCRUM-365).
 */
function EmptyTab({ builder }: Readonly<{ builder: ReportBuilder }>) {
  const searching = builder.query.trim() !== "" || builder.productIds.length > 0;
  if (!searching) return <p className="px-3 py-4 text-sm text-slate-600">{EMPTY_TAB_TEXT[builder.tab]}</p>;
  const other: SessionTab = builder.tab === "valid" ? "invalid" : "valid";
  const elsewhere = builder.tabCounts[other];
  return (
    <div className="space-y-1 px-3 py-4 text-sm text-slate-600">
      <p>Tidak ada sesi yang cocok dengan pencarian atau filter produk ini.</p>
      {elsewhere > 0 && <p>{`Ada ${elsewhere} sesi yang cocok di tab ${TAB_LABEL[other]}.`}</p>}
      <button type="button" className="font-medium text-indigo-700 hover:underline" onClick={builder.clearSearch}>
        Hapus pencarian
      </button>
    </div>
  );
}

function SessionRows({ builder, pickedIds }: Readonly<{ builder: ReportBuilder; pickedIds: ReadonlySet<string> }>) {
  return (
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
  );
}

/**
 * Field sesi (SCRUM-321, diperluas SCRUM-365): pencarian, filter produk, dan tab Valid / Tidak valid. Sesi tidak
 * valid tetap terlihat di tabnya, nonaktif, dengan alasan dari server (AC4). Pencarian, tab, dan filter produk
 * hanya mengubah yang tampil; sesi terpilih tetap ada di daftar Sesi terpilih di bawahnya.
 */
function SessionPicker({ builder }: Readonly<{ builder: ReportBuilder }>) {
  const pickedIds = new Set([...builder.picked, ...builder.dropped].map((s) => s.session_id));
  return (
    <fieldset className="space-y-2">
      <legend className={LEGEND}>Sesi</legend>
      <div className="flex flex-wrap items-start gap-2">
        <input
          type="search"
          aria-label="Cari sesi"
          placeholder="Cari nama sesi, id sesi, atau produk"
          maxLength={200}
          className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
          value={builder.query}
          onChange={(event) => builder.setQuery(event.target.value)}
        />
        <ProductFilter builder={builder} />
      </div>
      <Tabs
        label="Kelayakan sesi"
        idPrefix={SESSION_TABS}
        active={builder.tab}
        onChange={builder.setTab}
        tabs={SESSION_TAB_ORDER.map((tab) => ({ id: tab, label: `${TAB_LABEL[tab]} (${builder.tabCounts[tab]})` }))}
      />
      <div role="tabpanel" id={tabPanelId(SESSION_TABS, builder.tab)} aria-labelledby={tabElementId(SESSION_TABS, builder.tab)}>
        {builder.visibleSessions.length === 0 ? (
          <EmptyTab builder={builder} />
        ) : (
          <SessionRows builder={builder} pickedIds={pickedIds} />
        )}
      </div>
    </fieldset>
  );
}

/** Reasons the last Create gave for one picked session (409 ineligible, 404 missing). */
function createProblems(outcome: CreateOutcome | null, sessionId: string): string[] {
  if (outcome?.kind === "not_comparable") return (outcome.ineligible[sessionId] ?? []).map(reasonText);
  if (outcome?.kind === "sessions_missing" && outcome.sessionIds.includes(sessionId)) return [MISSING_ROW];
  return [];
}

/** What the live check said about this session now, then what the last Create said (no repeats). */
function sessionProblems(builder: ReportBuilder, sessionId: string): string[] {
  const live = (builder.view.bySession.get(sessionId) ?? []).map((violation) => violation.message);
  return [...new Set([...live, ...createProblems(builder.outcome, sessionId)])];
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
          {sessionProblems(builder, session.session_id).map((text) => (
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
    // <output> has the status role built in (Sonar S6819), so no role attribute is needed.
    return <output className="block text-sm text-green-800">Laporan tersimpan. Membuka laporan…</output>;
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
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900"
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
          options={plain(FILTER_OPTIONS)}
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
        <ValidationPanel builder={builder} />
      </div>

      <div className={CARD}>
        <RadioGroup
          legend="Jenis nilai"
          name="score-scope"
          options={builder.scopeOptions.map(scopeRadio)}
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
        {builder.canChooseLabel && (
          <ProductLabelPreview
            mode={builder.productLabelMode}
            productNames={builder.picked.map((session) => session.product_name)}
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
