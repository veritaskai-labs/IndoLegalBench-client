import type { Metadata } from "next";

import { PublishedReportList } from "@/components/reports/publication/PublishedReportList";

export const metadata: Metadata = {
  title: "Laporan terbit | IndoLegalBench",
};

/** Server component tipis supaya metadata tetap ada; daftarnya dimuat di client (PBI-17 AC9). */
export default function PublishedReportsPage() {
  return <PublishedReportList />;
}
