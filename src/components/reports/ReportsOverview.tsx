"use client";

import Link from "next/link";
import { useId } from "react";

import { GradedSessionList } from "@/components/grading/GradedSessionList";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useGradedSessions } from "@/hooks/useGradedSessions";
import { canSeeGradedSessions } from "@/lib/grading/gradingRules";

/**
 * Semua peran membuka laporan perbandingan (PBI-15, D9). Hasil penilaian sesi hanya untuk Admin, Viewer, dan
 * Kontributor (PBI-14 AC8, PBI-24 AC10), karena server menolaknya untuk Developer AI.
 */
export function ReportsOverview() {
  const auth = useAuth();
  if (auth.status === "loading") return <LoadingState />;
  if (auth.status !== "authenticated") return null;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold text-slate-900">Laporan</h1>
      <ComparisonReportsSection />
      {canSeeGradedSessions(auth.user.role) && <GradedSessionsSection />}
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
