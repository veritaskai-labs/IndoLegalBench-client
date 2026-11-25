"use client";

import { useParams } from "next/navigation";

import { ResultCaseDetail } from "@/components/reports/drilldown/ResultCaseDetail";
import { decodeRouteParam } from "@/lib/routeParams";

/** Satu kasus di balik angka laporan, sampai jawaban asli (PBI-16 AC2, D6 langkah 4–7). */
export default function ResultCasePage() {
  const params = useParams<{ id: string; resultId: string; caseId: string }>();
  return (
    <ResultCaseDetail
      reportId={decodeRouteParam(params.id)}
      resultId={decodeRouteParam(params.resultId)}
      caseId={decodeRouteParam(params.caseId)}
    />
  );
}
