"use client";

import { useParams } from "next/navigation";

import { GradingResultsBody } from "@/components/grading/GradingResultsBody";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useSessionResults } from "@/hooks/useSessionResults";
import { decodeRouteParam } from "@/lib/routeParams";
import { nonBlankText } from "@/lib/text";

const GENERAL_TITLE = "Hasil penilaian sesi";

/**
 * Hasil penilaian satu sesi untuk Viewer di menu Laporan (PBI-14 AC8, keputusan PO): hanya baca,
 * tanpa tombol Nilai, dan tanpa data eksekusi seperti biaya atau progres. Eksekusi tetap khusus
 * Admin dan Developer AI. Server yang menyaring: sesi yang belum berakhir dijawab 403.
 * Nama sesi dan produk datang bersama hasilnya (server#114); tanpa keduanya, judul umum dipakai.
 */
export default function SessionResultsReportPage() {
  const sessionId = decodeRouteParam(useParams<{ id: string }>().id);
  const results = useSessionResults(sessionId);

  const graded = results.status === "ready" ? results.data : null;
  const title = nonBlankText(graded?.session_label) ?? GENERAL_TITLE;
  const productName = nonBlankText(graded?.product_name);

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[{ label: "Laporan", href: "/reports" }, { label: results.status === "loading" ? null : title }]}
      />
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {productName && <p className="text-sm text-slate-600">Produk: {productName}</p>}
      </div>
      <GradingResultsBody results={results} />
    </div>
  );
}
