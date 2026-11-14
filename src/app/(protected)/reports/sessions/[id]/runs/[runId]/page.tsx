"use client";

import { useParams } from "next/navigation";

import { GradingResultsBody } from "@/components/grading/GradingResultsBody";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { useSessionRun } from "@/hooks/useSessionRun";
import { judgeLabel } from "@/lib/grading/gradingRules";
import { decodeRouteParam } from "@/lib/routeParams";
import { nonBlankText } from "@/lib/text";

const GENERAL_TITLE = "Hasil penilaian";

/**
 * Hasil satu grading run yang dibuka dari baris Laporan (PBI-22 AC9, K-21), hanya baca. Run bisa
 * yang lama atau dari judge lain. Server yang menyaring peran dan menyamarkan soal serta jawaban
 * mentah untuk Viewer dan Kontributor; sesi yang masih berjalan hanya untuk Admin.
 */
export default function ReportRunPage() {
  const routeParams = useParams<{ id: string; runId: string }>();
  const run = useSessionRun(decodeRouteParam(routeParams.id), decodeRouteParam(routeParams.runId));

  const graded = run.status === "ready" ? run.data : null;
  const title = nonBlankText(graded?.session_label) ?? GENERAL_TITLE;
  const productName = nonBlankText(graded?.product_name);
  const judge = judgeLabel(graded?.judge);

  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Laporan", href: "/reports" }, { label: run.status === "loading" ? null : title }]} />
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        {productName && <p className="text-sm text-slate-600">Produk: {productName}</p>}
        {judge && <p className="text-sm text-slate-600">LLM judge: {judge}</p>}
      </div>
      <GradingResultsBody results={run} />
    </div>
  );
}
