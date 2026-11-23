"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CasePreviewDrawer } from "@/components/cases/CasePreviewDrawer";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { DuplicateCaseDialog } from "@/components/cases/DuplicateCaseDialog";
import { SplitTagBadge } from "@/components/cases/SplitTagBadge";
import { SuiteCaseNav } from "@/components/cases/SuiteCaseNav";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useAuth } from "@/hooks/useAuth";
import { useSuites } from "@/hooks/useSuites";
import { listDirectoryCases, type CaseDirectoryRow } from "@/lib/cases/caseDirectory";
import { caseEditPath } from "@/lib/cases/casePaths";
import { CASE_STATUS_LABEL } from "@/lib/cases/caseStatus";
import { canCreateCase } from "@/lib/cases/permissions";
import type { CaseStatus } from "@/types/case";
import type { Suite } from "@/types/suite";

const FIELD = "min-h-10 min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 font-normal text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600";
const ACTION = "inline-flex min-h-9 items-center rounded-md px-2.5 font-medium focus-visible:outline-2 focus-visible:outline-indigo-600";

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
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<CaseStatus | "">("");
  const [suiteId, setSuiteId] = useState("");
  const [preview, setPreview] = useState<CaseDirectoryRow | null>(null);
  const [copy, setCopy] = useState<CaseDirectoryRow | null>(null);
  const [listRevision, setListRevision] = useState(0);
  const refreshSuites = () => { active.reload(); archived.reload(); };

  useEffect(() => {
    const timer = setTimeout(() => setKeyword(query.trim().toLocaleLowerCase("id-ID")), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const suites = [...active.suites, ...archived.suites];
  const suitesReady = active.status === "ready" && archived.status === "ready";
  const suitesFailed = active.status === "error" || archived.status === "error";
  const selectedSuite = suites.some((suite) => suite.id === suiteId) ? suiteId : "";
  const filtered = Boolean(query.trim() || status || selectedSuite);

  function reset() {
    setQuery("");
    setKeyword("");
    setStatus("");
    setSuiteId("");
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-900">Suite dan kasus</h1>
      <SuiteCaseNav current="/cases" />
      <div className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 text-sm sm:grid-cols-[2fr_1fr_1fr]">
        <div className="grid min-w-0 gap-1.5">
          <label htmlFor="case-directory-keyword" className="font-medium text-slate-700">Cari kasus</label>
          <input id="case-directory-keyword" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari ID atau judul kasus" className={FIELD} />
        </div>
        <div className="grid min-w-0 gap-1.5">
          <label htmlFor="case-directory-status" className="font-medium text-slate-700">Status</label>
          <select id="case-directory-status" value={status} onChange={(event) => setStatus(event.target.value as CaseStatus | "")} className={FIELD}>
            <option value="">Semua status</option>
            {Object.entries(CASE_STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        <div className="grid min-w-0 gap-1.5">
          <label htmlFor="case-directory-suite" className="font-medium text-slate-700">Suite</label>
          <select id="case-directory-suite" value={selectedSuite} onChange={(event) => setSuiteId(event.target.value)} disabled={!suitesReady} className={FIELD}>
            <option value="">Semua suite</option>
            {suites.map((suite) => <option key={suite.id} value={suite.id}>{suite.name}{suite.status === "archived" ? " (Arsip)" : ""}</option>)}
          </select>
        </div>
      </div>
      {filtered && (
        <button type="button" onClick={reset} className="min-h-9 rounded px-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50">
          Reset filter
        </button>
      )}
      {suitesFailed && <ErrorState message="Gagal memuat daftar suite." onRetry={refreshSuites} />}
      {!suitesReady && !suitesFailed && <LoadingState label="Memuat kasus…" />}
      {suitesReady && (
        <CaseResults
          suites={suites}
          suiteId={selectedSuite}
          status={status}
          keyword={keyword}
          filtered={filtered}
          revision={listRevision}
          onPreview={setPreview}
          onDuplicate={setCopy}
        />
      )}
      {preview && (
        <CasePreviewDrawer
          row={preview}
          onClose={() => setPreview(null)}
          onDuplicate={preview.suite.status === "active" ? () => setCopy(preview) : undefined}
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

function CaseResults({ suites, suiteId, status, keyword, filtered, revision, onPreview, onDuplicate }: Readonly<{
  suites: Suite[];
  suiteId: string;
  status: CaseStatus | "";
  keyword: string;
  filtered: boolean;
  revision: number;
  onPreview: (row: CaseDirectoryRow) => void;
  onDuplicate: (row: CaseDirectoryRow) => void;
}>) {
  const selected = suiteId ? suites.filter(({ id }) => id === suiteId) : suites;
  const resource = useAsyncResource(
    JSON.stringify([revision, status, selected.map(({ id, name, status }) => [id, name, status])]),
    () => listDirectoryCases(selected, status || undefined),
    () => "Gagal memuat daftar kasus.",
  );
  if (resource.status === "loading") return <LoadingState label="Memuat kasus…" />;
  if (resource.status === "error") return <ErrorState message={resource.message} onRetry={resource.reload} />;

  const rows = keyword ? resource.data.filter(({ item }) =>
    [item.case_code, item.title].some((text) => text.toLocaleLowerCase("id-ID").includes(keyword)),
  ) : resource.data;

  return (
    <div className="space-y-2">
      <p role="status" className="text-sm text-slate-600">{rows.length} kasus</p>
      {rows.length === 0 ? (
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
              {rows.map((row) => (
                <tr key={row.item.id} className="hover:bg-slate-50">
                  <th scope="row" className="px-3 py-2 font-mono text-xs font-medium [overflow-wrap:anywhere]">
                    <Link href={caseEditPath(row.item.id)} className="hover:underline">{row.item.case_code}</Link>
                  </th>
                  <td className="px-3 py-2 [overflow-wrap:anywhere]">{row.item.title || "Kasus tanpa judul"}</td>
                  <td className="px-3 py-2 [overflow-wrap:anywhere]">
                    {row.suite.name}{row.suite.status === "archived" && <span className="block text-xs text-slate-500">Arsip</span>}
                  </td>
                  <td className="px-3 py-2"><SplitTagBadge tag={row.item.split_tag} /></td>
                  <td className="px-3 py-2"><CaseStatusBadge status={row.item.status} /></td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1">
                      <button type="button" aria-label={`Pratinjau ${row.item.case_code}`} onClick={() => onPreview(row)} className={`${ACTION} border border-slate-300 hover:bg-white`}>Pratinjau</button>
                      {row.suite.status === "active" && (
                        <button type="button" aria-label={`Duplikat ${row.item.case_code}`} onClick={() => onDuplicate(row)} className={`${ACTION} text-indigo-700 hover:bg-indigo-50`}>Duplikat</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
