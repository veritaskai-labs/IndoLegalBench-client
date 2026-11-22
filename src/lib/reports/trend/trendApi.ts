import type { ScoreScope, TrendMetric, TrendRange, TrendRead } from "@/types/reports";

export interface TrendQuery {
  productId: string;
  scope: ScoreScope;
  metric: TrendMetric;
  range: TrendRange;
}

export interface TrendGateway {
  get(query: TrendQuery): Promise<TrendRead>;
  pdf(query: TrendQuery): Promise<Blob>;
}

export const httpTrendGateway: TrendGateway = {
  get: () => Promise.reject(new Error("not implemented")),
  pdf: () => Promise.reject(new Error("not implemented")),
};
