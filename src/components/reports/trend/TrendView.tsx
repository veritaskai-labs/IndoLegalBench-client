"use client";

import { useState } from "react";

import { TrendFilters } from "@/components/reports/trend/TrendFilters";
import { TrendResult } from "@/components/reports/trend/TrendResult";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useTrend } from "@/hooks/useTrend";
import { useTrendProducts } from "@/hooks/useTrendProducts";
import { allowedScoreScopes } from "@/lib/reports/builder/builderRules";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";
import { httpTrendGateway, type TrendGateway } from "@/lib/reports/trend/trendApi";
import { effectiveTrendScope, type ProductOption } from "@/lib/reports/trend/trendRules";
import type { Role } from "@/types";
import type { ScoreScope, TrendMetric, TrendRange } from "@/types/reports";

interface Gateways {
  trendGateway: TrendGateway;
  reportsGateway: Pick<ReportsGateway, "eligibleSessions">;
}

/**
 * Halaman tren kualitas produk (PBI-17). Semua peran membukanya; yang berbeda hanya jenis kasus yang boleh dipilih
 * (AC1, AC12). Komponen ini hanya merangkai: pilihan sah per peran ada di trendRules, pemuatan di hook, gambar di
 * komponen tren.
 */
export function TrendView({
  trendGateway = httpTrendGateway,
  reportsGateway = httpReportsGateway,
}: Readonly<Partial<Gateways>>) {
  const auth = useAuth();
  if (auth.status === "loading") return <LoadingState />;
  if (auth.status !== "authenticated") return null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Tren kualitas produk</h1>
        <p className="text-sm text-slate-600">
          Perkembangan skor satu produk AI dari bulan ke bulan. Garis putus-putus berarti data pembanding berubah.
        </p>
      </div>
      <TrendProducts role={auth.user.role} trendGateway={trendGateway} reportsGateway={reportsGateway} />
    </div>
  );
}

/** Komponen terpisah supaya daftar produk hanya diminta untuk sesi yang sudah dikenal. */
function TrendProducts({ role, trendGateway, reportsGateway }: Readonly<Gateways & { role: Role }>) {
  const products = useTrendProducts(reportsGateway);
  if (products.status === "loading") return <LoadingState label="Memuat produk…" />;
  if (products.status === "error") return <ErrorState message={products.message} onRetry={products.reload} />;
  if (products.data.length === 0) {
    return (
      <EmptyState
        title="Belum ada produk yang diukur"
        description="Tren muncul setelah sebuah produk punya sesi pengukuran yang sudah selesai dan dinilai."
      />
    );
  }
  return <TrendPanel products={products.data} role={role} gateway={trendGateway} />;
}

/** Pilihan awal: produk pertama menurut nama, skor test, skor total, semua bulan (AC2, AC3, AC12). */
function TrendPanel({
  products,
  role,
  gateway,
}: Readonly<{ products: readonly ProductOption[]; role: Role; gateway: TrendGateway }>) {
  const [productId, setProductId] = useState(products[0].id);
  const [metric, setMetric] = useState<TrendMetric>("total");
  const [range, setRange] = useState<TrendRange>("all");
  const [scope, setScope] = useState<ScoreScope>("test");

  const scopes = allowedScoreScopes(role);
  const query = { productId, scope: effectiveTrendScope(role, scope), metric, range };
  const trend = useTrend(query, gateway);

  return (
    <div className="space-y-4">
      <TrendFilters
        products={products}
        productId={productId}
        metric={metric}
        range={range}
        scope={query.scope}
        scopes={scopes}
        onProductChange={setProductId}
        onMetricChange={setMetric}
        onRangeChange={setRange}
        onScopeChange={setScope}
      />
      <TrendResult trend={trend} query={query} gateway={gateway} />
    </div>
  );
}
