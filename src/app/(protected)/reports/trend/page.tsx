import type { Metadata } from "next";

import { TrendView } from "@/components/reports/trend/TrendView";

export const metadata: Metadata = {
  title: "Tren kualitas | IndoLegalBench",
};

/** Server component tipis supaya metadata tetap ada; halamannya bergantung pada peran, jadi di client (SCRUM-334). */
export default function TrendPage() {
  return <TrendView />;
}
