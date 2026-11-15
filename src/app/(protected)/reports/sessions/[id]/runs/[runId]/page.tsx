"use client";

import { useParams } from "next/navigation";

import { GradingResultsBody } from "@/components/grading/GradingResultsBody";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useSessionRun } from "@/hooks/useSessionRun";
import { decodeRouteParam } from "@/lib/routeParams";
import { nonBlankText } from "@/lib/text";

const GENERAL_TITLE = "Hasil penilaian";

/**
 * Hasil satu grading run yang dibuka dari baris Laporan (PBI-22 AC9, K-21), hanya baca. Run bisa
 * yang lama atau dari judge lain; LLM judge-nya tampil di ringkasan GradingResultsBody (K-11), sama
 * seperti di halaman hasil lain. Server yang menyaring peran dan menyamarkan soal serta jawaban
 * mentah untuk Viewer dan Kontributor; sesi yang masih berjalan hanya untuk Admin.
 */
export default function ReportRunPage() {
  const routeParams = useParams<{ id: string; runId: string }>();
  const run = useSessionRun(decodeRouteParam(routeParams.id), decodeRouteParam(routeParams.runId));

  const graded = run.status === "ready" ? run.data : null;
  const title = nonBlankText(graded?.session_label) ?? GENERAL_TITLE;
  const productName = nonBlankText(graded?.product_name);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Laporan", href: "/reports" }, { label: run.status === "loading" ? null : title }]} />
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {productName && <p className="text-sm text-slate-600">Produk: {productName}</p>}
      </div>
      <GradingResultsBody results={run} />
    </div>
  );
}
