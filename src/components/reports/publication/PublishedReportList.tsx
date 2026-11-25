"use client";

import Link from "next/link";

import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { formatWibDate } from "@/lib/datetime/formatWib";
import { httpPublicationGateway, type PublicationGateway } from "@/lib/reports/publicationApi";
import { productLabelsText, publishedListErrorMessage, versionLabel } from "@/lib/reports/publicationRules";
import type { PublishedReportListItem } from "@/types/reports";

const CELL = "px-3 py-2 align-top";

function PublishedTable({ items }: Readonly<{ items: readonly PublishedReportListItem[] }>) {
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full min-w-[640px] text-sm text-slate-800">
        <thead className="bg-slate-50 text-left text-xs text-slate-600">
          <tr>
            <th scope="col" className={CELL}>Judul</th>
            <th scope="col" className={CELL}>Versi</th>
            <th scope="col" className={CELL}>Produk</th>
            <th scope="col" className={CELL}>Diterbitkan</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t border-slate-100">
              <th scope="row" className={`${CELL} text-left font-medium`}>
                <Link
                  href={`/reports/comparisons/${encodeURIComponent(item.report_id)}`}
                  className="text-indigo-700 hover:underline"
                >
                  {item.title}
                </Link>
              </th>
              <td className={`${CELL} whitespace-nowrap`}>{versionLabel(item.version_no)}</td>
              <td className={CELL}>{productLabelsText(item.product_labels)}</td>
              <td className={`${CELL} whitespace-nowrap`}>{formatWibDate(item.published_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Laporan terbit (PBI-17 SCRUM-335, AC9): versi yang sedang terbit, terbaru dulu seperti urutan server, untuk
 * semua pengguna yang login. Hanya di dalam platform: tidak ada tautan publik atau tombol bagikan. Nama produk
 * adalah label beku dari server menurut aturan PBI-15 (AC10). Versi yang sudah diganti tidak ada di daftar ini
 * tetapi tetap tersimpan dan bisa dibuka dari Laporan perbandingan (status Digantikan).
 */
export function PublishedReportList({ gateway = httpPublicationGateway }: Readonly<{ gateway?: PublicationGateway }>) {
  const published = useAsyncResource<PublishedReportListItem[]>(
    "published-reports",
    () => gateway.listPublished(),
    publishedListErrorMessage,
  );

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Laporan", href: "/reports" }, { label: "Laporan terbit" }]} />
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Laporan terbit</h1>
        <p className="text-sm text-slate-600">
          Laporan perbandingan yang diterbitkan Admin, untuk semua pengguna yang login. Versi lama yang sudah diganti
          tetap tersimpan dan bisa dibuka dari{" "}
          <Link href="/reports/comparisons" className="font-medium text-indigo-700 hover:underline">
            Laporan perbandingan
          </Link>
          .
        </p>
      </div>
      {published.status === "loading" && <LoadingState label="Memuat daftar laporan terbit…" />}
      {published.status === "error" && <ErrorState variant="card" message={published.message} onRetry={published.reload} />}
      {published.status === "ready" &&
        (published.data.length === 0 ? (
          <EmptyState title="Belum ada laporan terbit" description="Laporan yang diterbitkan Admin akan muncul di sini." />
        ) : (
          <PublishedTable items={published.data} />
        ))}
    </div>
  );
}
