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
import { CASE_STATUS_LABEL } from "@/lib/cases/caseStatus";
import { canCreateCase } from "@/lib/cases/permissions";
import { formatRelativeTime, formatWib } from "@/lib/datetime/formatWib";
import type { CaseStatus } from "@/types/case";

const FIRST_PAGE: CaseDirectoryQuery = { q: "", status: "", suiteId: "", page: 1 };

export default function CasesPage() {
  const auth = useAuth();
  if (auth.status !== "authenticated") return <LoadingState />;
  if (!canCreateCase(auth.user.role)) {
    return (
      <div className="space-y-4">
        <ErrorState message="Anda tidak memiliki izin untuk melihat daftar kasus ini." />
        <Link href={auth.user.role === "developer_ai" ? "/suites" : "/reports"} className="text-sm font-medium text-indigo-700">
          Kembali
        </Link>
      </div>
    );
  }
  return <CaseDirectory />;
}

function CaseDirectory() {
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
        <h1 className="font-serif text-4xl leading-10 text-ink">Suite dan kasus</h1>
        <p className="mt-2 text-sm text-muted">
          Cari, pratinjau, dan duplikasi kasus uji hukum dari seluruh suite.
        </p>
      </header>

      <SuiteCaseNav current="/cases" />

      <div className="space-y-3">
        <label className="relative block w-full sm:max-w-sm">
          <span className="sr-only">Cari kasus</span>
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
            placeholder="Cari ID atau judul kasus"
            className="pl-9"
          />
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-ink-soft">Filter Status:</span>
              <fieldset
                className="m-0 flex min-w-0 flex-wrap items-center gap-1.5 border-0 p-0"
                aria-label="Filter status kasus"
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
                  Semua
                </button>
                {Object.entries(CASE_STATUS_LABEL).map(([value, label]) => {
                  const selected = request.status === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={selected}
                      onClick={() =>
                        setRequest((current) => ({
                          ...current,
                          status: value as CaseStatus,
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
                Pilih suite
              </label>
              <select
                id="case-directory-suite"
                value={request.suiteId}
                onChange={(event) => {
                  const suiteId = event.target.value;
                  setRequest((current) => ({ ...current, suiteId, page: 1 }));
                }}
                disabled={!suitesReady}
                className="h-8 min-w-0 rounded-control border border-line bg-paper px-3 text-xs text-ink disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-ink"
              >
                <option value="">Semua suite</option>
                {request.suiteId && !suites.some(({ id }) => id === request.suiteId) && (
                  <option value={request.suiteId}>Suite tidak tersedia</option>
                )}
                {suites.map((suite) => (
                  <option key={suite.id} value={suite.id}>
                    {suite.name}
                    {suite.status === "archived" ? " (Arsip)" : ""}
                  </option>
                ))}
              </select>
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
            Reset filter
          </Button>
        </div>
      </div>
      {suitesFailed && <ErrorState message="Gagal memuat daftar suite." onRetry={refreshSuites} />}
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

function CaseResults({ request, revision, onPageChange, onPreview, onDuplicate }: Readonly<{
  request: CaseDirectoryQuery;
  revision: number;
  onPageChange: (page: number) => void;
  onPreview: (row: CaseDirectoryRow) => void;
  onDuplicate: (row: CaseDirectoryRow) => void;
}>) {
  const resource = useAsyncResource(
    JSON.stringify([revision, request.q, request.status, request.suiteId, request.page]),
    () => listDirectoryCases(request),
    () => "Gagal memuat daftar kasus.",
  );
  const lastPage = resource.status === "ready" ? Math.max(1, Math.ceil(resource.data.total / resource.data.size)) : 1;
  const pastEnd = resource.status === "ready" && request.page > lastPage;
  useEffect(() => {
    if (pastEnd) onPageChange(lastPage);
  }, [pastEnd, lastPage, onPageChange]);

  const columns = useMemo<Column<CaseDirectoryRow>[]>(
    () => [
      {
        key: "case_code",
        header: "ID Kasus",
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
        header: "Judul Pertanyaan",
        sortable: true,
        sortValue: (row) => row.title || "Kasus tanpa judul",
        cell: (row) => (
          <span className="font-medium text-ink">
            {row.title || "Kasus tanpa judul"}
          </span>
        ),
      },
      {
        key: "suite_name",
        header: "Suite",
        sortable: true,
        cell: (row) => (
          <span className="text-ink-soft">
            {row.suite_name}
            {row.suite_archived && <span className="block text-xs text-muted">Arsip</span>}
          </span>
        ),
      },
      {
        key: "split_tag",
        header: "Tag",
        cell: (row) => <SplitTagBadge tag={row.split_tag} />,
      },
      {
        key: "status",
        header: "Status",
        cell: (row) => <CaseStatusBadge status={row.status} />,
      },
      {
        key: "updated_at",
        header: "Terakhir Diubah",
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
        header: "Aksi",
        cell: (row) => (
          <div className="flex gap-1.5">
            <button
              type="button"
              aria-label={`Pratinjau ${row.case_code}`}
              onClick={() => onPreview(row)}
              className={buttonClasses({ variant: "ghost", size: "sm" })}
            >
              Pratinjau
            </button>
            {!row.suite_archived && (
              <button
                type="button"
                aria-label={`Duplikat ${row.case_code}`}
                onClick={() => onDuplicate(row)}
                className="inline-flex h-8 cursor-pointer items-center justify-center rounded-control px-3 text-[13px] font-medium text-accent-ink transition-colors hover:bg-accent-wash"
              >
                Duplikat
              </button>
            )}
          </div>
        ),
      },
    ],
    [onDuplicate, onPreview],
  );

  if (resource.status === "loading" || pastEnd) return <LoadingState label="Memuat kasus…" />;
  if (resource.status === "error") return <ErrorState message={resource.message} onRetry={resource.reload} />;

  const { items, total, page } = resource.data;
  const filtered = Boolean(request.q || request.status || request.suiteId);

  return (
    <div className="space-y-3">
      <output className="block text-[13px] text-muted">{total} kasus</output>
      {items.length === 0 ? (
        <div className="rounded-control border border-line bg-paper">
          <EmptyState title={filtered ? "Tidak ada kasus yang sesuai" : "Belum ada kasus"}
            description={filtered ? "Ubah kata kunci atau filter untuk melihat hasil lain." : "Kasus yang ditambahkan ke suite akan muncul di sini."}
          />
        </div>
      ) : (
        <div className="[&_th:first-child]:pl-4 [&_td:first-child]:pl-4 [&_th:last-child]:w-px [&_th:last-child]:pr-4 [&_td:last-child]:w-px [&_td:last-child]:pr-4 [&_td:last-child]:whitespace-nowrap">
          <DataTable
            columns={columns}
            rows={items}
            rowKey={(row) => row.id}
            pageSize={20}
            caption="Daftar kasus"
            initialSort={{ key: "updated_at", direction: "desc" }}
          />
        </div>
      )}
      {lastPage > 1 && <Pager page={page} lastPage={lastPage} onPageChange={onPageChange} />}
    </div>
  );
}
