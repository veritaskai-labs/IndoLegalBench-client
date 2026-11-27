"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { ResultCaseDetail } from "@/components/reports/drilldown/ResultCaseDetail";
import { CASE_SORT_PARAM, parseCaseSort } from "@/lib/reports/drilldownRules";
import { decodeRouteParam } from "@/lib/routeParams";

/** Urutan daftar asalnya (?urut=) untuk Kasus sebelumnya, Kasus berikutnya, dan jalan kembali (SCRUM-378). */
function ResultCaseView() {
  const params = useParams<{ id: string; resultId: string; caseId: string }>();
  return (
    <ResultCaseDetail
      reportId={decodeRouteParam(params.id)}
      resultId={decodeRouteParam(params.resultId)}
      caseId={decodeRouteParam(params.caseId)}
      sort={parseCaseSort(useSearchParams().get(CASE_SORT_PARAM))}
    />
  );
}

/** Satu kasus di balik angka laporan, sampai jawaban asli (PBI-16 AC2, D6 langkah 4–7). Suspense untuk useSearchParams. */
export default function ResultCasePage() {
  return (
    <Suspense>
      <ResultCaseView />
    </Suspense>
  );
}
