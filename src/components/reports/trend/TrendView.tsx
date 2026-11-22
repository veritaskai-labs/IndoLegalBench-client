/* eslint-disable @typescript-eslint/no-unused-vars */
import type { ReportsGateway } from "@/lib/reports/reportsApi";
import type { TrendGateway } from "@/lib/reports/trend/trendApi";

export function TrendView({
  trendGateway,
  reportsGateway,
}: Readonly<{ trendGateway?: TrendGateway; reportsGateway?: Pick<ReportsGateway, "eligibleSessions"> }>) {
  return null;
}
