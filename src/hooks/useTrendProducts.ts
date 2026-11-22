"use client";

import { useAsyncResource } from "@/hooks/useAsyncResource";
import { httpReportsGateway, type ReportsGateway } from "@/lib/reports/reportsApi";
import { productOptions, type ProductOption } from "@/lib/reports/trend/trendRules";

const PRODUCTS_ERROR = "Daftar produk gagal dimuat. Coba lagi.";

/**
 * Produk yang bisa dipilih di halaman tren, diturunkan dari daftar sesi laporan karena endpoint itu terbuka untuk
 * semua peran (daftar produk lain hanya untuk Admin atau peran tertentu). Semua jenis sesi dimuat; trennya
 * sendiri yang menyaring sesi layak.
 */
export function useTrendProducts(gateway: Pick<ReportsGateway, "eligibleSessions"> = httpReportsGateway) {
  return useAsyncResource<ProductOption[]>(
    "trend-products",
    () => gateway.eligibleSessions("all").then(productOptions),
    () => PRODUCTS_ERROR,
  );
}
