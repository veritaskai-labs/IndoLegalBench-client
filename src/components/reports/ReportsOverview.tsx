"use client";

import Link from "next/link";
import { useId } from "react";

import { GradedSessionList } from "@/components/grading/GradedSessionList";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useGradedSessions } from "@/hooks/useGradedSessions";
import { canSeeGradedSessions } from "@/lib/grading/gradingRules";

/**
 * Isi halaman Laporan. Admin, Viewer, dan Kontributor membaca hasil penilaian sesi di sini (PBI-14
 * AC8, PBI-24 AC10; keputusan PO: Viewer tidak membuka Eksekusi) dan laporan perbandingan (PBI-15). Peran lain
 * tetap melihat placeholder; menu Developer AI menunggu keputusan SA.
 */
export function ReportsOverview() {
  const auth = useAuth();
  if (auth.status === "loading") return <LoadingState />;

  const role = auth.status === "authenticated" ? auth.user.role : null;
  if (!canSeeGradedSessions(role)) {
    return (
      <PlaceholderPage
        title="Halaman Laporan"
        description="Fitur laporan perbandingan belum tersedia dan akan hadir pada sprint berikutnya."
      />
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Laporan</h1>
      <ComparisonReportsSection />
      <GradedSessionsSection />
    </div>
  );
}

function ComparisonReportsSection() {
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div>
        <h2 id={headingId} className="text-base font-semibold text-slate-900">
          Laporan perbandingan
        </h2>
        <p className="text-sm text-slate-600">Laporan tersimpan yang membandingkan beberapa produk dari hasil beku, lengkap dengan PDF-nya.</p>
      </div>
      <Link
        href="/reports/comparisons"
        className="inline-block rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
      >
        Buka laporan perbandingan
      </Link>
    </section>
  );
}

/** Komponen terpisah supaya hook-nya hanya berjalan, dan request hanya terkirim, untuk peran yang boleh. */
function GradedSessionsSection() {
  const headingId = useId();
  const sessions = useGradedSessions();

  return (
    <section aria-labelledby={headingId} className="space-y-3">
      <div>
        <h2 id={headingId} className="text-base font-semibold text-slate-900">
          Hasil penilaian sesi
        </h2>
        <p className="text-sm text-slate-600">Satu baris per penilaian dari sesi yang sudah selesai, lengkap dengan LLM judge dan versi rubriknya. Pilih satu untuk melihat skornya.</p>
      </div>
      <GradedSessionList sessions={sessions} />
    </section>
  );
}
