import type { Metadata } from "next";

import { ReportBuilderForm } from "@/components/reports/comparison/ReportBuilderForm";

export const metadata: Metadata = {
  title: "Buat laporan perbandingan | IndoLegalBench",
};

/** Server component tipis supaya metadata tetap ada; formnya berjalan di client (SCRUM-321). */
export default function NewReportPage() {
  return <ReportBuilderForm />;
}
