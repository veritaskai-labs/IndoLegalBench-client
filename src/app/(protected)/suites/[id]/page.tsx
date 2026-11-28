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
import { CASE_STATUS_LABEL } from "@/lib/cases/caseStatus";
import { formatRelativeTime, formatWib } from "@/lib/datetime/formatWib";
import type { Suite } from "@/types/suite";

interface PageProps {
  params: Promise<{ id: string }>;
}

const ALL_STATUSES: { value: CaseStatus; label: string }[] = [
  { value: "draft", label: CASE_STATUS_LABEL.draft },
  { value: "in_review", label: CASE_STATUS_LABEL.in_review },
  { value: "needs_revision", label: CASE_STATUS_LABEL.needs_revision },
  { value: "approved", label: CASE_STATUS_LABEL.approved },
];

const TAG_FILTERS: { value: SplitTag | "all"; label: string }[] = [
  { value: "all", label: "Dev & Test" },
  { value: "dev", label: "Hanya Dev" },
  { value: "test", label: "Hanya Test" },
];

/** Tombol Tambah Kasus di header; nonaktif di suite yang diarsipkan. Tidak dipakai untuk Developer AI. */
function WriteCaseAction({
  loaded,
  canWrite,
  onNewCase,
}: Readonly<{ loaded: boolean; canWrite: boolean; onNewCase: () => void }>) {
  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <Button
        variant="primary"
        onClick={onNewCase}
        disabled={!canWrite}
        className="w-full sm:w-auto"
      >
        <Icon name="tambah" size={14} />
        Tambah Kasus
      </Button>
      {loaded && !canWrite && (
        <p className="text-xs text-muted">
          Suite diarsipkan, kasus baru tidak bisa ditulis.
        </p>
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
  const isAll = selected.length === 0;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-ink-soft">Filter Status:</span>
      <fieldset
        className="m-0 flex min-w-0 flex-wrap items-center gap-1.5 border-0 p-0"
        aria-label="Filter status kasus"
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
          Semua
        </button>
        {ALL_STATUSES.map(({ value, label }) => {
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
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-medium text-ink-soft">Tag:</span>
      <fieldset
        className="m-0 flex min-w-0 flex-wrap items-center gap-1.5 border-0 p-0"
        aria-label="Filter tag kasus"
      >
        {TAG_FILTERS.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={selected}
              className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                selected
                  ? "border-accent bg-accent-wash font-semibold text-accent-ink"
                  : "border-line bg-paper text-ink-soft hover:bg-surface"
              }`}
            >
              {option.label}
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
  if (filtered) {
    return (
      <EmptyState
        title="Tidak ada kasus yang sesuai dengan filter"
        description="Coba ubah atau reset filter status, tag, atau kata kunci pencarian."
        action={{ label: "Reset Filter", onClick: onReset }}
      />
    );
  }
  let description = "Suite ini diarsipkan, jadi kasus baru tidak bisa ditulis.";
  if (isDeveloperAi) description = "Belum ada kasus yang disetujui di suite ini.";
  else if (canWrite) description = "Mulai buat kasus hukum pertama untuk suite ini.";
  const canStart = canWrite && !isDeveloperAi;
  return (
    <EmptyState
      title="Belum ada kasus di suite ini"
      description={description}
      action={canStart ? { label: "Tambah Kasus Sekarang", onClick: onNewCase } : undefined}
    />
  );
}

type PageError = { message: string; retryable: boolean; scope: "suite" | "cases" };

function toPageError(err: unknown, scope: PageError["scope"]): PageError {
  if (err instanceof ApiError) {
    if (err.status === 404 || err.status === 422) {
      return { message: "Suite tidak ditemukan atau telah dihapus.", retryable: false, scope: "suite" };
    }
    if (err.status === 403) {
      return { message: "Anda tidak memiliki izin untuk melihat suite ini.", retryable: false, scope: "suite" };
    }
    return { message: "Gagal memuat data. Silakan coba beberapa saat lagi.", retryable: true, scope };
  }
  return { message: "Terjadi kesalahan jaringan atau koneksi server.", retryable: true, scope };
}

function buildSuiteCaseColumns(
  casePath: (id: string) => string,
): Column<CaseSummary>[] {
  return [
    {
      key: "case_code",
      header: "ID Kasus",
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
      header: "Judul Pertanyaan",
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
      header: "Tag",
      cell: (item) => <SplitTagBadge tag={item.split_tag} />,
    },
    {
      key: "status",
      header: "Status",
      cell: (item) => <CaseStatusBadge status={item.status} />,
    },
    {
      key: "completeness_pct",
      header: "Kelengkapan",
      sortable: true,
      cell: (item) =>
        item.masked ? (
          <span className="text-subtle">—</span>
        ) : (
          <div className="flex items-center gap-2">
            <div className="w-20 shrink-0">
              <ProgressBar
                percent={item.completeness_pct}
                label={`Kelengkapan ${item.case_code}`}
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
      header: "Terakhir Diubah",
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

export default function SuiteDetailPage({ params }: PageProps) {
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
          setSuiteError(toPageError(err, "suite"));
        }
      }
    };

    void loadSuite();
    return () => {
      ignore = true;
    };
  }, [suiteId]);

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
        setCasesError(toPageError(err, "cases"));
      } finally {
        if (id === requestId.current) {
          setLoading(false);
        }
      }
    };

    void loadCases();
  }, [suiteId, selectedStatuses, splitTagFilter]);

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
        setCasesError(toPageError(err, "cases"));
      })
      .finally(() => {
        if (id === requestId.current) {
          setLoading(false);
        }
      });
  }, [suiteId, selectedStatuses, splitTagFilter]);

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
    () => buildSuiteCaseColumns(casePath),
    [casePath],
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
          Kembali ke Suites
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
            { label: "Suite dan kasus", href: "/suites" },
            { label: suite?.name ?? null },
          ]}
        />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href="/suites"
                aria-label="Kembali ke Suite dan kasus"
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
                {suite?.name ?? "Memuat suite…"}
              </h1>
              {suite && (
                <Badge tone={canWrite ? "green" : "gray"} dot>
                  {canWrite ? "Aktif" : "Arsip"}
                </Badge>
              )}
            </div>
            <p className="mt-2 text-sm text-muted">
              {suite?.description || "Kelola dan pantau seluruh test case hukum di dalam suite ini."}
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
          <span className="sr-only">Cari ID atau judul</span>
          <Icon
            name="cari"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <Input
            type="search"
            placeholder="Cari ID atau judul"
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
            Reset Filter
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
            caption="Daftar kasus dalam suite"
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
