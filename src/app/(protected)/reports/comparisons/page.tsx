import type { Metadata } from "next";

import { SavedReportList } from "@/components/reports/comparison/SavedReportList";

export const metadata: Metadata = {
  title: "Laporan perbandingan | IndoLegalBench",
};

/** Server component tipis supaya metadata tetap ada; daftarnya dimuat di client (D3 langkah 10). */
export default function SavedReportsPage() {
  return <SavedReportList />;
}
