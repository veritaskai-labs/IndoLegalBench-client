"use client";

import { useParams } from "next/navigation";

import { ResultCaseList } from "@/components/reports/drilldown/ResultCaseList";
import { decodeRouteParam } from "@/lib/routeParams";

/** Kasus di balik satu angka laporan (PBI-16 AC1, D6 langkah 1–3). */
export default function ResultCasesPage() {
  const params = useParams<{ id: string; resultId: string }>();
  return <ResultCaseList reportId={decodeRouteParam(params.id)} resultId={decodeRouteParam(params.resultId)} />;
}
