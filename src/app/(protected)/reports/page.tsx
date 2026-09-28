import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "Laporan | IndoLegalBench",
};

export default function ReportsPage() {
  return <PlaceholderPage title="Halaman Laporan" description="Fitur laporan perbandingan belum tersedia dan akan hadir pada sprint berikutnya." />;
}