"use client";

import { TrendChart } from "@/components/reports/trend/TrendChart";
import { TrendNotices } from "@/components/reports/trend/TrendNotices";
import { TrendPdfButton } from "@/components/reports/trend/TrendPdfButton";
import { TrendTable } from "@/components/reports/trend/TrendTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import type { AsyncResource } from "@/hooks/useAsyncResource";
import type { TrendGateway, TrendQuery } from "@/lib/reports/trend/trendApi";
import { TREND_METRIC_LABEL } from "@/lib/reports/trend/trendLabels";
import { hasDrawablePoint, trendWarnings } from "@/lib/reports/trend/trendRules";
import type { TrendRead } from "@/types/reports";

/**
 * Isi halaman tren untuk satu kombinasi pilihan: loading, error, kosong, atau grafik dengan tabel dan unduhan.
 * Garis hanya digambar bila ada titik yang punya skor; tanpa itu hanya peringatan dan tabelnya yang tampil
 * (PBI-17 AC11). Judul tabel mengikuti pilihan metrik di layar, bukan isi balasan.
 */
export function TrendResult({
  trend,
  query,
  gateway,
}: Readonly<{
  trend: AsyncResource<TrendRead> & { reload: () => void };
  query: TrendQuery;
  gateway: TrendGateway;
}>) {
  if (trend.status === "loading") return <LoadingState label="Memuat tren…" />;
  if (trend.status === "error") return <ErrorState message={trend.message} onRetry={trend.reload} />;

  const { points, product_name: productName } = trend.data;
  if (points.length === 0) {
    return (
      <EmptyState
        title="Belum ada tren"
        description="Produk ini belum punya sesi yang sudah selesai dan dinilai pada jenis kasus ini."
      />
    );
  }

  return (
    <div className="space-y-4">
      <TrendNotices warnings={trendWarnings(trend.data)} />
      {hasDrawablePoint(points) && <TrendChart points={points} metric={query.metric} />}
      <TrendTable points={points} caption={`${TREND_METRIC_LABEL[query.metric]} ${productName} per bulan`} />
      <TrendPdfButton query={query} gateway={gateway} />
    </div>
  );
}
