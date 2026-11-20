import type { Metadata } from "next";

import { ReportBuilderForm } from "@/components/reports/comparison/ReportBuilderForm";

export const metadata: Metadata = {
  title: "",
};

export default function NewReportPage() {
  return <ReportBuilderForm />;
}
