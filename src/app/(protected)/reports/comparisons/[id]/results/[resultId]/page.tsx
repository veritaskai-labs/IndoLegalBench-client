"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

import { ResultCaseList } from "@/components/reports/drilldown/ResultCaseList";
import { CASE_SORT_PARAM, parseCaseSort, resultCasesHref } from "@/lib/reports/drilldownRules";
import { decodeRouteParam } from "@/lib/routeParams";

/**
 * Urutan pilihan pengguna disimpan di alamat (?urut=, SCRUM-378) dengan replace, jadi Back dan muat ulang tetap
 * membuka urutan yang sama dan detail kasus bisa mengikutinya.
 */
function ResultCasesView() {
  const params = useParams<{ id: string; resultId: string }>();
  const router = useRouter();
  const sort = parseCaseSort(useSearchParams().get(CASE_SORT_PARAM));
  const reportId = decodeRouteParam(params.id);
  const resultId = decodeRouteParam(params.resultId);
  return (
    <ResultCaseList
      reportId={reportId}
      resultId={resultId}
      sort={sort}
      onSortChange={(next) => router.replace(resultCasesHref(reportId, resultId, next), { scroll: false })}
    />
  );
}

/** Kasus di balik satu angka laporan (PBI-16 AC1, D6 langkah 1–3). Suspense untuk useSearchParams (Next). */
export default function ResultCasesPage() {
  return (
    <Suspense>
      <ResultCasesView />
    </Suspense>
  );
}
