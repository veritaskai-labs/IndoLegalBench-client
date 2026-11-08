import type { Metadata } from "next";

import { ReportsOverview } from "@/components/reports/ReportsOverview";

export const metadata: Metadata = {
  title: "Laporan | IndoLegalBench",
};

/** Server component tipis supaya metadata tetap ada; isinya bergantung pada peran, jadi di client. */
export default function ReportsPage() {
  return <ReportsOverview />;
}
