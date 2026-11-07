"use client";

import { useParams } from "next/navigation";

import { GradingResultsBody } from "@/components/grading/GradingResultsBody";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useSessionResults } from "@/hooks/useSessionResults";
import { decodeRouteParam } from "@/lib/routeParams";

/**
 * Hasil penilaian satu sesi untuk Viewer di menu Laporan (PBI-14 AC8, keputusan PO): hanya baca,
 * tanpa tombol Nilai, dan tanpa data eksekusi seperti biaya atau progres. Eksekusi tetap khusus
 * Admin dan Developer AI. Server yang menyaring: sesi yang belum berakhir dijawab 403.
 */
export default function SessionResultsReportPage() {
  const sessionId = decodeRouteParam(useParams<{ id: string }>().id);
  const results = useSessionResults(sessionId);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Laporan", href: "/reports" }, { label: "Hasil penilaian sesi" }]} />
      <h1 className="text-xl font-semibold text-slate-900">Hasil penilaian sesi</h1>
      <GradingResultsBody results={results} />
    </div>
  );
}
