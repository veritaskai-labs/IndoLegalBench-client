"use client";

import { useAsyncAction } from "@/hooks/useAsyncAction";
import { saveBlob } from "@/lib/browserDownload";
import { httpTrendGateway, type TrendGateway, type TrendQuery } from "@/lib/reports/trend/trendApi";
import { trendPdfErrorMessage, trendPdfFileName } from "@/lib/reports/trend/trendRules";

const BUTTON =
  "rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Unduh PDF dari tren yang sedang tampil (PBI-17 AC8). PDF dibuat server dari pilihan yang sama dengan grafik,
 * jadi angkanya tidak bisa berbeda. useAsyncAction menolak klik kedua selama yang pertama belum selesai.
 */
export function TrendPdfButton({
  query,
  gateway = httpTrendGateway,
}: Readonly<{ query: TrendQuery; gateway?: TrendGateway }>) {
  const { run, pending, error } = useAsyncAction(
    () => gateway.pdf(query),
    (file) => saveBlob(file, trendPdfFileName(query)),
    trendPdfErrorMessage,
  );

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" className={BUTTON} onClick={run} disabled={pending}>
        {pending ? "Menyiapkan PDF…" : "Unduh PDF"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
