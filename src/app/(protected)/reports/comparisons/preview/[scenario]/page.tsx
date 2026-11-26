"use client";

import Link from "next/link";
import { notFound, useParams } from "next/navigation";

import { ReportDocument } from "@/components/reports/comparison/ReportDocument";
import { devTestReport, firstReport } from "@/test/reportFixtures";
import type { ReportDetail, ReportLanguage } from "@/types/reports";

/** Skenario data contoh sintetis (L3) dari fixture bersama; bukan hasil pengukuran produk mana pun. */
// Bahasa tidak lagi ada di detail laporan (SCRUM-363). Bawaannya Indonesia (SCRUM-346 N7); skenario "first" tetap
// Inggris untuk meninjau laporan yang dibuat sebelum perubahan itu.
type Scenario = { report: ReportDetail; language?: ReportLanguage };

const SCENARIOS: Readonly<Record<string, () => Scenario>> = {
  first: () => ({ report: firstReport(), language: "en" }),
  "first-id": () => ({ report: firstReport(), language: "id" }),
  "dev-test": () => ({ report: devTestReport(), language: "id" }),
  empty: () => ({ report: firstReport({ sessions: [], case_basis: [] }) }),
};

/**
 * Pratinjau tampilan laporan dengan data contoh, hanya di mode pengembangan. Dipakai untuk meninjau rancangan
 * bersama SA dan PO serta usability test selama endpoint SCRUM-320 belum ada. Di build produksi halaman ini
 * selalu 404. Tombol PDF tidak ditampilkan karena PDF dibuat server.
 */
export default function ReportPreviewPage() {
  const { scenario } = useParams<{ scenario: string }>();
  if (process.env.NODE_ENV !== "development" || !Object.hasOwn(SCENARIOS, scenario)) notFound();
  const { report, language } = SCENARIOS[scenario]();

  return (
    <div className="space-y-5">
      <p className="rounded-lg border border-dashed border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Pratinjau dengan data contoh sintetis, hanya di mode pengembangan. Tombol PDF tidak tersedia karena PDF
        dibuat server (SCRUM-320).
      </p>
      <nav aria-label="Skenario pratinjau" className="flex flex-wrap gap-2 text-sm">
        {Object.keys(SCENARIOS).map((name) => (
          <Link
            key={name}
            href={`/reports/comparisons/preview/${name}`}
            aria-current={name === scenario ? "page" : undefined}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-slate-700 hover:bg-slate-50 aria-[current=page]:bg-slate-900 aria-[current=page]:text-white"
          >
            {name}
          </Link>
        ))}
      </nav>
      <ReportDocument report={report} language={language} />
    </div>
  );
}
