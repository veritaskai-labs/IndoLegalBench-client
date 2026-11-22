/* eslint-disable @typescript-eslint/no-unused-vars */
import type { AsyncResource } from "@/hooks/useAsyncResource";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";
import type { ProductOption } from "@/lib/reports/trend/trendRules";

export function useTrendProducts(
  gateway: Pick<ReportsGateway, "eligibleSessions"> = httpReportsGateway,
): AsyncResource<ProductOption[]> & { reload: () => void } {
  return { status: "loading", reload: () => undefined };
}
