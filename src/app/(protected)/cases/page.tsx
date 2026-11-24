"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CasePreviewDrawer } from "@/components/cases/CasePreviewDrawer";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { DuplicateCaseDialog } from "@/components/cases/DuplicateCaseDialog";
import { SplitTagBadge } from "@/components/cases/SplitTagBadge";
import { SuiteCaseNav } from "@/components/cases/SuiteCaseNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { Pager } from "@/components/ui/Pager";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useAuth } from "@/hooks/useAuth";
import { useSuites } from "@/hooks/useSuites";
import { listDirectoryCases, type CaseDirectoryQuery, type CaseDirectoryRow } from "@/lib/cases/caseDirectory";
import { caseEditPath } from "@/lib/cases/casePaths";
import { CASE_STATUS_LABEL } from "@/lib/cases/caseStatus";
import { canCreateCase } from "@/lib/cases/permissions";
import type { CaseStatus } from "@/types/case";

const FIELD = "min-h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600";
const ACTION = "inline-flex min-h-9 items-center rounded-md px-2.5 font-medium focus-visible:outline-2 focus-visible:outline-indigo-600";
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
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">Suite dan kasus</h1>
      <SuiteCaseNav current="/cases" />
      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 text-sm sm:grid-cols-[2fr_1fr_1fr]">
        <div className="grid min-w-0 gap-1.5">
          <label htmlFor="case-directory-keyword" className="font-medium text-slate-700">Cari kasus</label>
          <input id="case-directory-keyword" type="search" maxLength={200} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari ID atau judul kasus" className={FIELD} />
        </div>
        <div className="grid min-w-0 gap-1.5">
          <label htmlFor="case-directory-status" className="font-medium text-slate-700">Status</label>
          <select id="case-directory-status" value={request.status} onChange={(event) => {
            const status = event.target.value as CaseStatus | "";
            setRequest((current) => ({ ...current, status, page: 1 }));
          }} className={FIELD}>
            <option value="">Semua status</option>
            {Object.entries(CASE_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="grid min-w-0 gap-1.5">
          <label htmlFor="case-directory-suite" className="font-medium text-slate-700">Suite</label>
          <select id="case-directory-suite" value={request.suiteId} onChange={(event) => {
            const suiteId = event.target.value;
            setRequest((current) => ({ ...current, suiteId, page: 1 }));
          }} disabled={!suitesReady} className={FIELD}>
            <option value="">Semua suite</option>
            {request.suiteId && !suites.some(({ id }) => id === request.suiteId) && (
              <option value={request.suiteId}>Suite tidak tersedia</option>
            )}
            {suites.map((suite) => <option key={suite.id} value={suite.id}>{suite.name}{suite.status === "archived" ? " (Arsip)" : ""}</option>)}
          </select>
        </div>
      </div>
      {canReset && (
        <button type="button" onClick={() => { setQuery(""); setRequest(FIRST_PAGE); }} className="min-h-9 rounded px-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
          Reset filter
        </button>
      )}
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

  if (resource.status === "loading" || pastEnd) return <LoadingState label="Memuat kasus…" />;
  if (resource.status === "error") return <ErrorState message={resource.message} onRetry={resource.reload} />;

  const { items, total, page } = resource.data;
  const filtered = Boolean(request.q || request.status || request.suiteId);

  return (
    <div className="space-y-2">
      <output className="block text-sm text-slate-600">{total} kasus</output>
      {items.length === 0 ? (
        <div className="rounded-md border border-slate-200 bg-white">
          <EmptyState title={filtered ? "Tidak ada kasus yang sesuai" : "Belum ada kasus"}
            description={filtered ? "Ubah kata kunci atau filter untuk melihat hasil lain." : "Kasus yang ditambahkan ke suite akan muncul di sini."}
          />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border border-slate-200 bg-white">
          <table className="w-full min-w-[40rem] text-left text-sm" aria-label="Daftar kasus">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-700">
              <tr>{["ID Kasus", "Judul Pertanyaan", "Suite", "Tag", "Status", "Aksi"].map((label) => (
                <th key={label} scope="col" className="px-3 py-3 font-semibold">{label}</th>
              ))}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-900">
              {items.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50">
                  <th scope="row" className="px-3 py-2 font-mono text-xs font-medium [overflow-wrap:anywhere]">
                    <Link href={caseEditPath(row.id)} className="hover:underline">{row.case_code}</Link>
                  </th>
                  <td className="px-3 py-2 [overflow-wrap:anywhere]">{row.title || "Kasus tanpa judul"}</td>
                  <td className="px-3 py-2 [overflow-wrap:anywhere]">
                    {row.suite_name}{row.suite_archived && <span className="block text-xs text-slate-500">Arsip</span>}
                  </td>
                  <td className="px-3 py-2"><SplitTagBadge tag={row.split_tag} /></td>
                  <td className="px-3 py-2"><CaseStatusBadge status={row.status} /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button type="button" aria-label={`Pratinjau ${row.case_code}`} onClick={() => onPreview(row)} className={`${ACTION} border border-slate-300 hover:bg-white`}>Pratinjau</button>
                      {!row.suite_archived && (
                        <button type="button" aria-label={`Duplikat ${row.case_code}`} onClick={() => onDuplicate(row)} className={`${ACTION} text-indigo-700 hover:bg-indigo-50`}>Duplikat</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lastPage > 1 && <Pager page={page} lastPage={lastPage} onPageChange={onPageChange} />}
    </div>
  );
}
