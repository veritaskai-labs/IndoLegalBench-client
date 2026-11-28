"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { SplitTagBadge } from "@/components/cases/SplitTagBadge";
import {
  Badge,
  Breadcrumb,
  Button,
  type Column,
  DataTable,
  EmptyState,
  ErrorState,
  Icon,
  Input,
  LoadingSkeleton,
  ProgressBar,
} from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import {
  type CaseStatus,
  type CaseSummary,
  getCasesForSuite,
  type SplitTag,
} from "@/lib/api/cases";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { isDeveloperAiSession } from "@/lib/auth";
import { caseEditPath, caseReadPath } from "@/lib/cases/casePaths";
import { caseStatusLabel } from "@/lib/cases/caseStatus";
import { formatRelativeTime, formatWib } from "@/lib/datetime/formatWib";
import { fill, messages } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import type { Suite } from "@/types/suite";

const COPY = messages({
  id: {
    addCase: "Tambah Kasus",
    archivedHint: "Suite diarsipkan, kasus baru tidak bisa ditulis.",
    statusFilter: "Filter Status:",
    statusGroup: "Filter status kasus",
    all: "Semua",
    tag: "Tag:",
    tagGroup: "Filter tag kasus",
    bothTags: "Dev & Test",
    devOnly: "Hanya Dev",
    testOnly: "Hanya Test",
    noMatch: "Tidak ada kasus yang sesuai dengan filter",
    noMatchHint: "Coba ubah atau reset filter status, tag, atau kata kunci pencarian.",
    reset: "Reset Filter",
    archivedEmpty: "Suite ini diarsipkan, jadi kasus baru tidak bisa ditulis.",
    devEmpty: "Belum ada kasus yang disetujui di suite ini.",
    writeEmpty: "Mulai buat kasus hukum pertama untuk suite ini.",
    emptyTitle: "Belum ada kasus di suite ini",
    addNow: "Tambah Kasus Sekarang",
    suiteGone: "Suite tidak ditemukan atau telah dihapus.",
    suiteForbidden: "Anda tidak memiliki izin untuk melihat suite ini.",
    loadFailed: "Gagal memuat data. Silakan coba beberapa saat lagi.",
    network: "Terjadi kesalahan jaringan atau koneksi server.",
    back: "Kembali ke Suites",
    crumb: "Suite dan kasus",
    backToList: "Kembali ke Suite dan kasus",
    loadingSuite: "Memuat suite…",
    active: "Aktif",
    archived: "Arsip",
    fallbackDescription: "Kelola dan pantau seluruh test case hukum di dalam suite ini.",
    searchLabel: "Cari ID atau judul",
    searchPlaceholder: "Cari ID atau judul",
    caseId: "ID Kasus",
    questionTitle: "Judul Pertanyaan",
    tagHeader: "Tag",
    status: "Status",
    completeness: "Kelengkapan",
    completenessOf: "Kelengkapan {code}",
    updated: "Terakhir Diubah",
    caption: "Daftar kasus dalam suite",
  },
  en: {
    addCase: "Add case",
    archivedHint: "The suite is archived, so a new case cannot be written.",
    statusFilter: "Status filter:",
    statusGroup: "Filter cases by status",
    all: "All",
    tag: "Tag:",
    tagGroup: "Filter cases by tag",
    bothTags: "Dev & test",
    devOnly: "Dev only",
    testOnly: "Test only",
    noMatch: "No cases match the filter",
    noMatchHint: "Try changing or resetting the status, tag, or search.",
    reset: "Reset filters",
    archivedEmpty: "This suite is archived, so a new case cannot be written.",
    devEmpty: "There are no approved cases in this suite yet.",
    writeEmpty: "Start by writing the first legal case for this suite.",
    emptyTitle: "No cases in this suite yet",
    addNow: "Add a case now",
    suiteGone: "The suite was not found or has been deleted.",
    suiteForbidden: "You do not have permission to view this suite.",
    loadFailed: "Could not load the data. Try again in a moment.",
    network: "A network or server connection error occurred.",
    back: "Back to suites",
    crumb: "Suites and cases",
    backToList: "Back to suites and cases",
    loadingSuite: "Loading suite…",
    active: "Active",
    archived: "Archived",
    fallbackDescription: "Manage and follow every legal test case in this suite.",
    searchLabel: "Search by ID or title",
    searchPlaceholder: "Search by ID or title",
    caseId: "Case ID",
    questionTitle: "Question title",
    tagHeader: "Tag",
    status: "Status",
    completeness: "Completeness",
    completenessOf: "Completeness {code}",
    updated: "Last changed",
    caption: "Cases in this suite",
  },
});

type SuiteDetailCopy = (typeof COPY)["id"];

interface PageProps {
  params: Promise<{ id: string }>;
}

const ALL_STATUSES: readonly CaseStatus[] = ["draft", "in_review", "needs_revision", "approved"];

const TAG_FILTERS: readonly (SplitTag | "all")[] = ["all", "dev", "test"];

/** Tombol Tambah Kasus di header; nonaktif di suite yang diarsipkan. Tidak dipakai untuk Developer AI. */
function WriteCaseAction({
  loaded,
  canWrite,
  onNewCase,
}: Readonly<{ loaded: boolean; canWrite: boolean; onNewCase: () => void }>) {
  const copy = useText(COPY);
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button
        variant="primary"
        onClick={onNewCase}
        disabled={!canWrite}
        className="w-full sm:w-auto"
      >
        <Icon name="tambah" size={14} />
        {copy.addCase}
      </Button>
      {loaded && !canWrite && (
        <p className="text-xs text-muted">{copy.archivedHint}</p>
      )}
    </div>
  );
}

function StatusFilter({
  selected,
  onClear,
  onToggle,
}: Readonly<{
  selected: CaseStatus[];
  onClear: () => void;
  onToggle: (status: CaseStatus) => void;
}>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const isAll = selected.length === 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-ink-soft">{copy.statusFilter}</span>
      <fieldset
        className="m-0 flex min-w-0 flex-wrap items-center gap-1.5 border-0 p-0"
        aria-label={copy.statusGroup}
      >
        <button
          type="button"
          onClick={onClear}
          aria-pressed={isAll}
          className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
            isAll
              ? "border-accent bg-accent-wash font-semibold text-accent-ink"
              : "border-line bg-paper text-ink-soft hover:bg-surface"
          }`}
        >
          {copy.all}
        </button>
        {ALL_STATUSES.map((value) => {
          const label = caseStatusLabel(value, locale);
          const isSelected = selected.includes(value);
          return (
            <button
              key={value}
              type="button"
              onClick={() => onToggle(value)}
              aria-pressed={isSelected}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-accent bg-accent-wash font-semibold text-accent-ink"
                  : "border-line bg-paper text-ink-soft hover:bg-surface"
              }`}
            >
              {label}
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}

function TagFilter({
  value,
  onChange,
}: Readonly<{ value: SplitTag | "all"; onChange: (tag: SplitTag | "all") => void }>) {
  const copy = useText(COPY);
  const tagLabel = { all: copy.bothTags, dev: copy.devOnly, test: copy.testOnly };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-ink-soft">{copy.tag}</span>
      <fieldset
        className="m-0 flex min-w-0 flex-wrap items-center gap-1.5 border-0 p-0"
        aria-label={copy.tagGroup}
      >
        {TAG_FILTERS.map((option) => {
          const selected = value === option;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              aria-pressed={selected}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                selected
                  ? "border-accent bg-accent-wash font-semibold text-accent-ink"
                  : "border-line bg-paper text-ink-soft hover:bg-surface"
              }`}
            >
              {tagLabel[option]}
            </button>
          );
        })}
      </fieldset>
    </div>
  );
}

/** Tabel kosong. Developer AI hanya melihat kasus approved dan tidak menulis kasus. */
function CaseListEmptyState({
  filtered,
  isDeveloperAi,
  canWrite,
  onReset,
  onNewCase,
}: Readonly<{
  filtered: boolean;
  isDeveloperAi: boolean;
  canWrite: boolean;
  onReset: () => void;
  onNewCase: () => void;
}>) {
  const copy = useText(COPY);
  if (filtered) {
    return (
      <EmptyState
        title={copy.noMatch}
        description={copy.noMatchHint}
        action={{ label: copy.reset, onClick: onReset }}
      />
    );
  }
  let description = copy.archivedEmpty;
  if (isDeveloperAi) description = copy.devEmpty;
  else if (canWrite) description = copy.writeEmpty;
  const canStart = canWrite && !isDeveloperAi;
  return (
    <EmptyState
      title={copy.emptyTitle}
      description={description}
      action={canStart ? { label: copy.addNow, onClick: onNewCase } : undefined}
    />
  );
}

type PageError = { message: string; retryable: boolean; scope: "suite" | "cases" };

function toPageError(err: unknown, scope: PageError["scope"], copy: SuiteDetailCopy): PageError {
  if (err instanceof ApiError) {
    if (err.status === 404 || err.status === 422) {
      return { message: copy.suiteGone, retryable: false, scope: "suite" };
    }
    if (err.status === 403) {
      return { message: copy.suiteForbidden, retryable: false, scope: "suite" };
    }
    return { message: copy.loadFailed, retryable: true, scope };
  }
  return { message: copy.network, retryable: true, scope };
}

function buildSuiteCaseColumns(
  casePath: (id: string) => string,
  copy: SuiteDetailCopy,
): Column<CaseSummary>[] {
  return [
    {
      key: "case_code",
      header: copy.caseId,
      sortable: true,
      cell: (item) =>
        item.masked ? (
          <span className="font-mono font-medium text-subtle">{item.case_code}</span>
        ) : (
          <Link
            href={casePath(item.id)}
            className="font-mono font-semibold text-ink hover:underline"
          >
            {item.case_code}
          </Link>
        ),
    },
    {
      key: "title",
      header: copy.questionTitle,
      sortable: true,
      cell: (item) =>
        item.masked ? (
          <span className="italic text-muted">{item.title}</span>
        ) : (
          <span className="font-medium text-ink">{item.title}</span>
        ),
    },
    {
      key: "split_tag",
      header: copy.tagHeader,
      cell: (item) => <SplitTagBadge tag={item.split_tag} />,
    },
    {
      key: "status",
      header: copy.status,
      cell: (item) => <CaseStatusBadge status={item.status} />,
    },
    {
      key: "completeness_pct",
      header: copy.completeness,
      sortable: true,
      cell: (item) =>
        item.masked ? (
          <span className="text-subtle">—</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-20 shrink-0">
              <ProgressBar
                percent={item.completeness_pct}
                label={fill(copy.completenessOf, { code: item.case_code })}
              />
            </div>
            <span className="font-mono text-xs tabular-nums text-ink-soft">
              {item.completeness_pct}%
            </span>
          </div>
        ),
    },
    {
      key: "updated_at",
      header: copy.updated,
      sortable: true,
      sortValue: (item) => item.updated_at,
      cell: (item) => (
        <span title={formatWib(item.updated_at)} className="text-ink-soft">
          {formatRelativeTime(item.updated_at)}
        </span>
      ),
    },
  ];
}

export default function SuiteDetailPage({ params }: Readonly<PageProps>) {
  const copy = useText(COPY);
  const { id: suiteId } = use(params);
  const router = useRouter();
  const auth = useAuth();
  // Developer AI hanya melihat kasus approved dan tidak menulis kasus (SCRUM-183).
  const isDeveloperAi = isDeveloperAiSession(auth);
  const casePath = isDeveloperAi ? caseReadPath : caseEditPath;

  const [suite, setSuite] = useState<Suite | null>(null);
  const [suiteError, setSuiteError] = useState<PageError | null>(null);

  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [casesError, setCasesError] = useState<PageError | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<CaseStatus[]>([]);
  const [splitTagFilter, setSplitTagFilter] = useState<SplitTag | "all">("all");

  const requestId = useRef(0);

  const toggleStatus = (status: CaseStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  };

  // Muat data suite
  useEffect(() => {
    let ignore = false;
    const loadSuite = async () => {
      try {
        const data = await apiFetch<Suite>(`/suites/${suiteId}`);
        if (!ignore) {
          setSuite(data);
          setSuiteError(null);
        }
      } catch (err) {
        if (!ignore) {
          setSuiteError(toPageError(err, "suite", copy));
        }
      }
    };

    void loadSuite();
    return () => {
      ignore = true;
    };
  }, [copy, suiteId]);

  // Muat data kasus saat dependency berubah
  useEffect(() => {
    const id = ++requestId.current;

    const loadCases = async () => {
      try {
        const singleStatus = selectedStatuses.length === 1 ? selectedStatuses[0] : undefined;
        const data = await getCasesForSuite(suiteId, {
          status: singleStatus,
          split_tag: splitTagFilter === "all" ? undefined : splitTagFilter,
        });
        if (id !== requestId.current) return;
        setCases(data);
        setCasesError(null);
      } catch (err) {
        if (id !== requestId.current) return;
        setCasesError(toPageError(err, "cases", copy));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
        }
      }
    };

    void loadCases();
  }, [copy, suiteId, selectedStatuses, splitTagFilter]);

  // Retry handler untuk tombol coba lagi
  const handleRetryCases = useCallback(() => {
    const id = ++requestId.current;
    setLoading(true);
    setCasesError(null);

    const singleStatus = selectedStatuses.length === 1 ? selectedStatuses[0] : undefined;
    getCasesForSuite(suiteId, {
      status: singleStatus,
      split_tag: splitTagFilter === "all" ? undefined : splitTagFilter,
    })
      .then((data) => {
        if (id !== requestId.current) return;
        setCases(data);
      })
      .catch((err) => {
        if (id !== requestId.current) return;
        setCasesError(toPageError(err, "cases", copy));
      })
      .finally(() => {
        if (id === requestId.current) {
          setLoading(false);
        }
      });
  }, [copy, suiteId, selectedStatuses, splitTagFilter]);

  const displayedCases = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return cases.filter((item) => {
      if (selectedStatuses.length > 1 && !selectedStatuses.includes(item.status)) {
        return false;
      }
      if (!query) return true;
      return (
        item.case_code.toLowerCase().includes(query) ||
        item.title.toLowerCase().includes(query)
      );
    });
  }, [cases, selectedStatuses, searchQuery]);

  const columns = useMemo<Column<CaseSummary>[]>(
    () => buildSuiteCaseColumns(casePath, copy),
    [casePath, copy],
  );

  const hasActiveFilters =
    selectedStatuses.length > 0 ||
    splitTagFilter !== "all" ||
    searchQuery.trim() !== "";
  const resetFilters = () => {
    setSelectedStatuses([]);
    setSplitTagFilter("all");
    setSearchQuery("");
  };

  const fatal = suiteError && suiteError.scope === "suite" ? suiteError : null;
  const fatalFromCases = casesError && casesError.scope === "suite" ? casesError : null;
  const pageLevelError = fatal ?? fatalFromCases;

  if (pageLevelError) {
    return (
      <div className="space-y-4">
        <ErrorState variant="card" message={pageLevelError.message} />
        <Link href="/suites" className="text-sm font-medium text-accent-ink hover:underline">
          {copy.back}
        </Link>
      </div>
    );
  }

  const canWrite = suite?.status === "active";
  const listError = casesError && casesError.scope === "cases" ? casesError : null;
  const goNewCase = () => router.push(`/suites/${suiteId}/cases/new`);

  return (
    <div className="space-y-6">
      {/* Header suite */}
      <header className="space-y-2">
        <Breadcrumb
          items={[
            { label: copy.crumb, href: "/suites" },
            { label: suite?.name ?? null },
          ]}
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/suites"
                aria-label={copy.backToList}
                className="inline-flex size-8 items-center justify-center rounded-control text-ink-soft transition-colors hover:bg-surface hover:text-ink"
              >
                <svg
                  aria-hidden="true"
                  width={18}
                  height={18}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>
              <h1 className="font-serif text-4xl leading-10 text-ink">
                {suite?.name ?? copy.loadingSuite}
              </h1>
              {suite && (
                <Badge tone={canWrite ? "green" : "gray"} dot>
                  {canWrite ? copy.active : copy.archived}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-muted">
              {suite?.description || copy.fallbackDescription}
            </p>
          </div>

          {!isDeveloperAi && (
            <WriteCaseAction loaded={suite !== null} canWrite={canWrite} onNewCase={goNewCase} />
          )}
        </div>
      </header>

      {/* Search & Filter bar */}
      <div className="space-y-3">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">{copy.searchLabel}</span>
          <Icon
            name="cari"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <Input
            type="search"
            placeholder={copy.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {!isDeveloperAi && (
              <StatusFilter
                selected={selectedStatuses}
                onClear={() => setSelectedStatuses([])}
                onToggle={toggleStatus}
              />
            )}
            <TagFilter value={splitTagFilter} onChange={setSplitTagFilter} />
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            disabled={!hasActiveFilters}
          >
            {copy.reset}
          </Button>
        </div>
      </div>

      {/* Error state */}
      {listError && !loading && (
        <ErrorState
          variant="card"
          message={listError.message}
          onRetry={listError.retryable ? handleRetryCases : undefined}
        />
      )}

      {/* Case table */}
      {!listError && loading && (
        <div className="overflow-x-auto rounded-control border border-line bg-paper">
          <table className="w-full border-separate border-spacing-0 text-left text-[13px]">
            <tbody>
              <LoadingSkeleton variant="table" rows={5} columns={6} />
            </tbody>
          </table>
        </div>
      )}

      {!listError && !loading && displayedCases.length === 0 && (
        <CaseListEmptyState
          filtered={hasActiveFilters}
          isDeveloperAi={isDeveloperAi}
          canWrite={canWrite}
          onReset={resetFilters}
          onNewCase={goNewCase}
        />
      )}

      {!listError && !loading && displayedCases.length > 0 && (
        <div className="[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:nth-child(n+3)]:w-px [&_th:nth-child(n+3)]:px-5 [&_td:nth-child(n+3)]:w-px [&_td:nth-child(n+3)]:px-5 [&_td:nth-child(n+3)]:whitespace-nowrap [&_th:last-child]:pr-4 [&_td:last-child]:pr-4">
          <DataTable
            key={`${selectedStatuses.join(",")}:${splitTagFilter}:${searchQuery.trim()}`}
            columns={columns}
            rows={displayedCases}
            rowKey={(item) => item.id}
            caption={copy.caption}
            rowClassName={(item) => (item.masked ? "bg-surface-hover cursor-default" : undefined)}
            onRowClick={(item) => {
              if (!item.masked) router.push(casePath(item.id));
            }}
          />
        </div>
      )}
    </div>
  );
}
