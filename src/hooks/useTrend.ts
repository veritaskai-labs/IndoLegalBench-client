"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { httpTrendGateway, type TrendGateway, type TrendQuery } from "@/lib/reports/trend/trendApi";
import { trendErrorMessage } from "@/lib/reports/trend/trendRules";
import type { TrendRead } from "@/types/reports";

/**
 * Tren satu produk untuk satu kombinasi pilihan (PBI-17 AC1 sampai AC3). Setiap kombinasi punya kunci sendiri, jadi
 * mengganti filter menampilkan loading dan membuang balasan terlambat dari kombinasi sebelumnya
 * (useAsyncResource). Gateway masuk sebagai parameter, jadi test dan komponen tidak terikat ke fetch.
 */
export function useTrend(query: TrendQuery, gateway: TrendGateway = httpTrendGateway) {
  const { productId, scope, metric, range } = query;
  return useAsyncResource<TrendRead>(
    `trend|${productId}|${scope}|${metric}|${range}`,
    () => gateway.get(query),
    trendErrorMessage,
  );
}
