"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CasePreviewDrawer } from "@/components/cases/CasePreviewDrawer";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { DuplicateCaseDialog } from "@/components/cases/DuplicateCaseDialog";
import { SplitTagBadge } from "@/components/cases/SplitTagBadge";
import { SuiteCaseNav } from "@/components/cases/SuiteCaseNav";
import { Button, buttonClasses, type Column, DataTable, EmptyState, ErrorState, Icon, Input, LoadingState } from "@/components/ui";
import { Pager } from "@/components/ui/Pager";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useAuth } from "@/hooks/useAuth";
import { useSuites } from "@/hooks/useSuites";
import { listDirectoryCases, type CaseDirectoryQuery, type CaseDirectoryRow } from "@/lib/cases/caseDirectory";
import { caseEditPath } from "@/lib/cases/casePaths";
import { caseStatusLabel } from "@/lib/cases/caseStatus";
import { canCreateCase } from "@/lib/cases/permissions";
import { formatRelativeTime, formatWib } from "@/lib/datetime/formatWib";
import { fill, messages } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import type { CaseStatus } from "@/types/case";

const STATUSES: readonly CaseStatus[] = ["draft", "in_review", "needs_revision", "approved"];

const COPY = messages({
  id: {
    forbidden: "Anda tidak memiliki izin untuk melihat daftar kasus ini.",
    back: "Kembali",
    heading: "Suite dan kasus",
    intro: "Cari, pratinjau, dan duplikasi kasus uji hukum dari seluruh suite.",
    searchLabel: "Cari kasus",
    searchPlaceholder: "Cari ID atau judul kasus",
    statusFilter: "Filter Status:",
    statusGroup: "Filter status kasus",
    all: "Semua",
    suiteLabel: "Pilih suite",
    allSuites: "Semua suite",
    suiteMissing: "Suite tidak tersedia",
    archivedSuffix: " (Arsip)",
    archivedMark: "Arsip",
    reset: "Reset filter",
    suitesFailed: "Gagal memuat daftar suite.",
    casesFailed: "Gagal memuat daftar kasus.",
    loading: "Memuat kasus…",
    countOne: "{total} kasus",
    countMany: "{total} kasus",
    noMatch: "Tidak ada kasus yang sesuai",
    noMatchHint: "Ubah kata kunci atau filter untuk melihat hasil lain.",
    empty: "Belum ada kasus",
    emptyHint: "Kasus yang ditambahkan ke suite akan muncul di sini.",
    caption: "Daftar kasus",
    caseId: "ID Kasus",
    questionTitle: "Judul Pertanyaan",
    untitled: "Kasus tanpa judul",
    suite: "Suite",
    tag: "Tag",
    status: "Status",
    updated: "Terakhir Diubah",
    actions: "Aksi",
    previewLabel: "Pratinjau {code}",
    preview: "Pratinjau",
    duplicateLabel: "Duplikat {code}",
    duplicate: "Duplikat",
  },
  en: {
    forbidden: "You do not have permission to view this case list.",
    back: "Back",
    heading: "Suites and cases",
    intro: "Search, preview, and duplicate legal test cases from every suite.",
    searchLabel: "Search cases",
    searchPlaceholder: "Search by case ID or title",
    statusFilter: "Status filter:",
    statusGroup: "Filter cases by status",
    all: "All",
    suiteLabel: "Choose a suite",
    allSuites: "All suites",
    suiteMissing: "Suite unavailable",
    archivedSuffix: " (Archived)",
    archivedMark: "Archived",
    reset: "Reset filters",
    suitesFailed: "Could not load the suite list.",
    casesFailed: "Could not load the case list.",
    loading: "Loading cases…",
    countOne: "{total} case",
    countMany: "{total} cases",
    noMatch: "No matching cases",
    noMatchHint: "Change the keyword or filters to see other results.",
    empty: "No cases yet",
    emptyHint: "Cases added to a suite will appear here.",
    caption: "Case list",
    caseId: "Case ID",
    questionTitle: "Question title",
    untitled: "Untitled case",
    suite: "Suite",
    tag: "Tag",
    status: "Status",
    updated: "Last changed",
    actions: "Actions",
    previewLabel: "Preview {code}",
    preview: "Preview",
    duplicateLabel: "Duplicate {code}",
    duplicate: "Duplicate",
  },
});

type CaseCopy = (typeof COPY)["id"];

const FIRST_PAGE: CaseDirectoryQuery = { q: "", status: "", suiteId: "", page: 1 };

export default function CasesPage() {
  const auth = useAuth();
  const copy = useText(COPY);
  if (auth.status !== "authenticated") return <LoadingState />;
  if (!canCreateCase(auth.user.role)) {
    return (
      <div className="space-y-4">
        <ErrorState message={copy.forbidden} />
        <Link href={auth.user.role === "developer_ai" ? "/suites" : "/reports"} className="text-sm font-medium text-indigo-700">
          {copy.back}
        </Link>
      </div>
    );
  }
  return <CaseDirectory />;
}

function CaseDirectory() {
  const labels = useText(COPY);
  const locale = useLocale();
  const router = useRouter();
  const active = useSuites("active");
  const archived = useSuites("archived");
  const [query, setQuery] = useState("");
  const [request, setRequest] = useState(FIRST_PAGE);
  const [preview, setPreview] = useState<CaseDirectoryRow | null>(null);
  const [copy, setCopy] = useState<CaseDirectoryRow | null>(null);
  const [listRevision, setListRevision] = useState(0);
  const refreshSuites = () => { active.reload(); archived.reload(); };
  const changePage = useCallback((page: number) => {
    setRequest((current) => ({ ...current, page }));
  }, []);

  useEffect(() => {
    const keyword = query.trim();
    const timer = setTimeout(() => {
      setRequest((current) => current.q === keyword ? current : { ...current, q: keyword, page: 1 });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const suites = [...active.suites, ...archived.suites];
  const suitesReady = active.status === "ready" && archived.status === "ready";
  const suitesFailed = active.status === "error" || archived.status === "error";
  const canReset = Boolean(query.trim() || request.q || request.status || request.suiteId);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-4xl leading-10 text-ink">{labels.heading}</h1>
        <p className="mt-2 text-sm text-muted">{labels.intro}</p>
      </header>

      <SuiteCaseNav current="/cases" />

      <div className="space-y-3">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">{labels.searchLabel}</span>
          <Icon
            name="cari"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted"
          />
          <Input
            id="case-directory-keyword"
            type="search"
            maxLength={200}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={labels.searchPlaceholder}
            className="pl-9"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-ink-soft">{labels.statusFilter}</span>
              <fieldset
                className="m-0 flex min-w-0 flex-wrap items-center gap-1.5 border-0 p-0"
                aria-label={labels.statusGroup}
              >
                <button
                  type="button"
                  aria-pressed={request.status === ""}
                  onClick={() => setRequest((current) => ({ ...current, status: "", page: 1 }))}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    request.status === ""
                      ? "border-accent bg-accent-wash font-semibold text-accent-ink"
                      : "border-line bg-paper text-ink-soft hover:bg-surface"
                  }`}
                >
                  {labels.all}
                </button>
                {STATUSES.map((value) => {
                  const label = caseStatusLabel(value, locale);
                  const selected = request.status === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setRequest((current) => ({
                          ...current,
                          status: value,
                          page: 1,
                        }))
                      }
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        selected
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

            <div className="flex items-center gap-2">
              <label htmlFor="case-directory-suite" className="text-xs font-medium text-ink-soft">
                {labels.suiteLabel}
              </label>
              <div className="relative">
                <select
                  id="case-directory-suite"
                  value={request.suiteId}
                  onChange={(event) => {
                    const suiteId = event.target.value;
                    setRequest((current) => ({ ...current, suiteId, page: 1 }));
                  }}
                  disabled={!suitesReady}
                  className="h-8 min-w-0 appearance-none rounded-control border border-line bg-paper pl-3 pr-9 text-xs text-ink disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-ink"
                >
                  <option value="">{labels.allSuites}</option>
                  {request.suiteId && !suites.some(({ id }) => id === request.suiteId) && (
                    <option value={request.suiteId}>{labels.suiteMissing}</option>
                  )}
                  {suites.map((suite) => (
                    <option key={suite.id} value={suite.id}>
                      {suite.name}
                      {suite.status === "archived" ? labels.archivedSuffix : ""}
                    </option>
                  ))}
                </select>
                <svg
                  aria-hidden="true"
                  width={14}
                  height={14}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setQuery("");
              setRequest(FIRST_PAGE);
            }}
            disabled={!canReset}
          >
            {labels.reset}
          </Button>
        </div>
      </div>
      {suitesFailed && <ErrorState message={labels.suitesFailed} onRetry={refreshSuites} />}
      <CaseResults
        request={request}
        revision={listRevision}
        onPageChange={changePage}
        onPreview={setPreview}
        onDuplicate={setCopy}
      />
      {preview && (
        <CasePreviewDrawer
          row={preview}
          onClose={() => setPreview(null)}
          onDuplicate={preview.suite_archived ? undefined : () => setCopy(preview)}
        />
      )}
      {copy && (
        <DuplicateCaseDialog
          row={copy}
          onClose={(afterError) => {
            setCopy(null);
            if (afterError) {
              setPreview(null);
              refreshSuites();
              setListRevision((revision) => revision + 1);
            }
          }}
          onDone={(id) => { setCopy(null); setPreview(null); router.push(caseEditPath(id)); }}
        />
      )}
    </div>
  );
}

function buildCaseColumns(
  labels: CaseCopy,
  onPreview: (row: CaseDirectoryRow) => void,
  onDuplicate: (row: CaseDirectoryRow) => void,
): Column<CaseDirectoryRow>[] {
  return [
    {
      key: "case_code",
      header: labels.caseId,
      sortable: true,
      cell: (row) => (
        <Link
          href={caseEditPath(row.id)}
          className="font-mono text-xs font-semibold text-ink hover:underline"
        >
          {row.case_code}
        </Link>
      ),
    },
    {
      key: "title",
      header: labels.questionTitle,
      sortable: true,
      sortValue: (row) => row.title || labels.untitled,
      cell: (row) => (
        <span className="font-medium text-ink">
          {row.title || labels.untitled}
        </span>
      ),
    },
    {
      key: "suite_name",
      header: labels.suite,
      sortable: true,
      cell: (row) => (
        <span className="text-ink-soft">
          {row.suite_name}
          {row.suite_archived && <span className="block text-xs text-muted">{labels.archivedMark}</span>}
        </span>
      ),
    },
    {
      key: "split_tag",
      header: labels.tag,
      cell: (row) => <SplitTagBadge tag={row.split_tag} />,
    },
    {
      key: "status",
      header: labels.status,
      cell: (row) => <CaseStatusBadge status={row.status} />,
    },
    {
      key: "updated_at",
      header: labels.updated,
      sortable: true,
      sortValue: (row) => row.updated_at,
      cell: (row) => (
        <span title={formatWib(row.updated_at)} className="text-ink-soft">
          {formatRelativeTime(row.updated_at)}
        </span>
      ),
    },
    {
      key: "actions",
      header: labels.actions,
      cell: (row) => (
        <div className="flex gap-1.5">
          <button
            type="button"
            aria-label={fill(labels.previewLabel, { code: row.case_code })}
            onClick={() => onPreview(row)}
            className={buttonClasses({ variant: "ghost", size: "sm" })}
          >
            {labels.preview}
          </button>
          {!row.suite_archived && (
            <button
              type="button"
              aria-label={fill(labels.duplicateLabel, { code: row.case_code })}
              onClick={() => onDuplicate(row)}
              className="inline-flex h-8 cursor-pointer items-center justify-center rounded-control px-3 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-wash"
            >
              {labels.duplicate}
            </button>
          )}
        </div>
      ),
    },
  ];
}

function CaseResults({ request, revision, onPageChange, onPreview, onDuplicate }: Readonly<{
  request: CaseDirectoryQuery;
  revision: number;
  onPageChange: (page: number) => void;
  onPreview: (row: CaseDirectoryRow) => void;
  onDuplicate: (row: CaseDirectoryRow) => void;
}>) {
  const labels = useText(COPY);
  const resource = useAsyncResource(
    JSON.stringify([revision, request.q, request.status, request.suiteId, request.page]),
    () => listDirectoryCases(request),
    () => labels.casesFailed,
  );
  const lastPage = resource.status === "ready" ? Math.max(1, Math.ceil(resource.data.total / resource.data.size)) : 1;
  const pastEnd = resource.status === "ready" && request.page > lastPage;
  useEffect(() => {
    if (pastEnd) onPageChange(lastPage);
  }, [pastEnd, lastPage, onPageChange]);

  const columns = useMemo<Column<CaseDirectoryRow>[]>(
    () => buildCaseColumns(labels, onPreview, onDuplicate),
    [labels, onDuplicate, onPreview],
  );

  if (resource.status === "loading" || pastEnd) return <LoadingState label={labels.loading} />;
  if (resource.status === "error") return <ErrorState message={resource.message} onRetry={resource.reload} />;

  const { items, total, page } = resource.data;
  const filtered = Boolean(request.q || request.status || request.suiteId);

  return (
    <div className="space-y-3">
      <output className="block text-[13px] text-muted">
        {fill(total === 1 ? labels.countOne : labels.countMany, { total })}
      </output>
      {items.length === 0 ? (
        <div className="rounded-control border border-line bg-paper">
          <EmptyState title={filtered ? labels.noMatch : labels.empty}
            description={filtered ? labels.noMatchHint : labels.emptyHint}
          />
        </div>
      ) : (
        <div className="[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:w-px [&_th:last-child]:pr-4 [&_td:last-child]:w-px [&_td:last-child]:pr-4 [&_td:last-child]:whitespace-nowrap">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(row) => row.id}
            pageSize={20}
            caption={labels.caption}
            initialSort={{ key: "updated_at", direction: "desc" }}
          />
        </div>
      )}
      {lastPage > 1 && <Pager page={page} lastPage={lastPage} onPageChange={onPageChange} />}
    </div>
  );
}
