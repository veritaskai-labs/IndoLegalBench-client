"use client";

import { useId } from "react";

import { GradedSessionList } from "@/components/grading/GradedSessionList";
import { PlaceholderPage } from "@/components/PlaceholderPage";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useGradedSessions } from "@/hooks/useGradedSessions";
import { canSeeGradedSessions } from "@/lib/grading/gradingRules";

/**
 * Isi halaman Laporan. Admin, Viewer, dan Kontributor membaca hasil penilaian sesi di sini (PBI-14
 * AC8, PBI-24 AC10; keputusan PO: Viewer tidak membuka Eksekusi). Laporan perbandingan (PBI-15–17) nanti menjadi bagian baru di
 * halaman ini. Peran lain, yang servernya menolak daftar ini, tetap melihat placeholder.
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
      <GradedSessionsSection />
    </div>
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
