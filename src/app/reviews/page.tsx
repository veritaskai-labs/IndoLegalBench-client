import type { Metadata } from "next";

import { PlaceholderPage } from "@/components/PlaceholderPage";

export const metadata: Metadata = {
  title: "Review | IndoLegalBench",
};

export default function ReviewsPage() {
  return <PlaceholderPage title="Halaman Review" description="Fitur review kasus belum tersedia dan akan hadir pada sprint berikutnya." />;
}