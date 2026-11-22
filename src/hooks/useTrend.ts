/* eslint-disable @typescript-eslint/no-unused-vars */
import type { AsyncResource } from "@/hooks/useAsyncResource";
import { httpTrendGateway, type TrendGateway, type TrendQuery } from "@/lib/reports/trend/trendApi";
import type { TrendRead } from "@/types/reports";

export function useTrend(
  query: TrendQuery,
  gateway: TrendGateway = httpTrendGateway,
): AsyncResource<TrendRead> & { reload: () => void } {
  return { status: "loading", reload: () => undefined };
}
