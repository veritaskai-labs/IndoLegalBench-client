"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LoadingSkeleton, EmptyState, ErrorState, Breadcrumb } from "@/components/ui";
import {
  getCasesForSuite,
  type CaseSummary,
  type CaseStatus,
  type SplitTag,
} from "@/lib/api/cases";
import { apiFetch, ApiError } from "@/lib/apiClient";
import { CASE_STATUS_LABEL } from "@/lib/cases/caseStatus";
import type { Suite } from "@/types/suite";

interface PageProps {
  params: Promise<{ id: string }>;
}

const STATUS_BADGES: Record<CaseStatus, { label: string; className: string }> = {
  draft: { label: CASE_STATUS_LABEL.draft, className: "bg-slate-100 text-slate-700 border-slate-200" },
  in_review: { label: CASE_STATUS_LABEL.in_review, className: "bg-amber-50 text-amber-800 border-amber-200" },
  needs_revision: { label: CASE_STATUS_LABEL.needs_revision, className: "bg-rose-50 text-rose-800 border-rose-200" },
  approved: { label: CASE_STATUS_LABEL.approved, className: "bg-emerald-50 text-emerald-800 border-emerald-200" },
};

const ALL_STATUSES: { value: CaseStatus; label: string }[] = [
  { value: "draft", label: CASE_STATUS_LABEL.draft },
  { value: "in_review", label: CASE_STATUS_LABEL.in_review },
  { value: "needs_revision", label: CASE_STATUS_LABEL.needs_revision },
  { value: "approved", label: CASE_STATUS_LABEL.approved },
];

/** Editor kasus dari SCRUM-108; belum ada halaman /cases/{id} tanpa /edit. */
const editPath = (caseId: string) => `/cases/${encodeURIComponent(caseId)}/edit`;

const completenessColor = (pct: number) =>
  pct === 100 ? "bg-emerald-600" : pct >= 60 ? "bg-teal-600" : "bg-amber-500";

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

export default function SuiteDetailPage({ params }: PageProps) {
  const { id: suiteId } = use(params);
  const router = useRouter();

  const [suite, setSuite] = useState<Suite | null>(null);
  const [suiteError, setSuiteError] = useState<PageError | null>(null);

  const [cases, setCases] = useState<CaseSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [casesError, setCasesError] = useState<PageError | null>(null);

  const [selectedStatuses, setSelectedStatuses] = useState<CaseStatus[]>([]);
  const [splitTagFilter, setSplitTagFilter] = useState<SplitTag | "all">("all");

  const requestId = useRef(0);

  const toggleStatus = (status: CaseStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status]
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

  const formatDate = (dateStr: string) => {
    try {
      return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const displayedCases = cases.filter((item) => {
    if (selectedStatuses.length <= 1) return true;
    return selectedStatuses.includes(item.status);
  });

  const hasActiveFilters = selectedStatuses.length > 0 || splitTagFilter !== "all";
  const resetFilters = () => {
    setSelectedStatuses([]);
    setSplitTagFilter("all");
  };

  const fatal = suiteError && suiteError.scope === "suite" ? suiteError : null;
  const fatalFromCases = casesError && casesError.scope === "suite" ? casesError : null;
  const pageLevelError = fatal ?? fatalFromCases;

  if (pageLevelError) {
    return (
      <div className="space-y-4">
        <ErrorState variant="card" message={pageLevelError.message} />
        <Link href="/suites" className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
          Kembali ke Suites
        </Link>
      </div>
    );
  }

  const canWrite = suite?.status === "active";
  const writeDisabledReason = suite && !canWrite
    ? "Suite diarsipkan, kasus baru tidak bisa ditulis."
    : undefined;

  const listError = casesError && casesError.scope === "cases" ? casesError : null;
  const goNewCase = () => router.push(`/suites/${suiteId}/cases/new`);

  return (
    <div className="space-y-6">
      {/* Header suite */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="mb-1">
            <Breadcrumb
            items={[{ label: "Suite", href: "/suites" },{ label: suite?.name ?? null },]}/>
            </div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              {suite?.name ?? "Memuat suite…"}
            </h1>
            {suite && (
              <span
                className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${
                  canWrite
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : "bg-slate-100 text-slate-700 border-slate-200"
                }`}
              >
                {canWrite ? "Aktif" : "Arsip"}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {suite?.description || "Kelola dan pantau seluruh test case hukum di dalam suite ini."}
          </p>
        </div>

        <div className="flex flex-col items-start sm:items-end gap-1">
          <button
            type="button"
            onClick={goNewCase}
            disabled={!canWrite}
            className="inline-flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-indigo-600"
          >
            Tulis Kasus
          </button>
          {writeDisabledReason && (
            <p className="text-[11px] text-slate-500">{writeDisabledReason}</p>
          )}
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white p-3.5 border border-slate-200 rounded text-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-700">Filter Status:</span>
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter status kasus">
              {ALL_STATUSES.map(({ value, label }) => {
                const isSelected = selectedStatuses.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleStatus(value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer ml-auto"
            >
              Reset Filter
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="filter-tag" className="font-semibold text-slate-700">
            Tag:
          </label>
          <select
            id="filter-tag"
            value={splitTagFilter}
            onChange={(e) => setSplitTagFilter(e.target.value as SplitTag | "all")}
            className="border border-slate-300 rounded px-2.5 py-1 bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="all">Semua Tag</option>
            <option value="dev">Dev</option>
            <option value="test">Test</option>
          </select>
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
      {!listError && (
        <div className="bg-white border border-slate-200 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                  <th scope="col" className="py-3 px-4 w-32">ID Kasus</th>
                  <th scope="col" className="py-3 px-4">Judul Pertanyaan</th>
                  <th scope="col" className="py-3 px-4 w-20">Tag</th>
                  <th scope="col" className="py-3 px-4 w-28">Status</th>
                  <th scope="col" className="py-3 px-4 w-36">Kelengkapan</th>
                  <th scope="col" className="py-3 px-4 w-32">Terakhir Diubah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading && <LoadingSkeleton variant="table" rows={5} columns={6} />}

                {!loading && displayedCases.length === 0 && (
                  <EmptyState
                    inTable
                    colSpan={6}
                    title={
                      hasActiveFilters
                        ? "Tidak ada kasus yang sesuai dengan filter"
                        : "Belum ada kasus di suite ini"
                    }
                    description={
                      hasActiveFilters
                        ? "Coba ubah atau reset filter status dan tag di atas."
                        : canWrite
                          ? "Mulai buat kasus hukum pertama untuk suite ini."
                          : "Suite ini diarsipkan, jadi kasus baru tidak bisa ditulis."
                    }
                    action={
                      hasActiveFilters
                        ? { label: "Reset Filter", onClick: resetFilters }
                        : canWrite
                          ? { label: "Tulis Kasus Sekarang", onClick: goNewCase }
                          : undefined
                    }
                  />
                )}

                {!loading &&
                  displayedCases.map((item) => {
                    const badge = STATUS_BADGES[item.status] ?? {
                      label: item.status,
                      className: "bg-slate-100 text-slate-700 border-slate-200",
                    };
                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => router.push(editPath(item.id))}
                      >
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                          <Link
                            href={editPath(item.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="hover:underline"
                          >
                            {item.case_code}
                          </Link>
                        </td>
                        <td className="py-3.5 px-4 text-slate-900 font-medium max-w-xs md:max-w-md truncate">
                          {item.title}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-block px-2 py-0.5 rounded font-mono text-[11px] bg-slate-100 text-slate-700">
                            {item.split_tag}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium border ${badge.className}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-1.5 rounded-full ${completenessColor(item.completeness_pct)}`}
                                style={{ width: `${item.completeness_pct}%` }}
                              />
                            </div>
                            <span className="font-mono text-[11px] text-slate-600">
                              {item.completeness_pct}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {formatDate(item.updated_at)}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}