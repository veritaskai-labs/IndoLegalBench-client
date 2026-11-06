"use client";

import { RubricVersionForm } from "@/components/rubrics/RubricVersionForm";
import { RubricVersionList } from "@/components/rubrics/RubricVersionList";
import { ErrorState, LoadingSkeleton } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useRubricVersions } from "@/hooks/useRubricVersions";

/**
 * Rubrik penilaian (PBI-14 AC7). Rutenya /admin/rubrics, sama dengan menu dan API. Halaman hanya
 * merangkai: data dari useRubricVersions, tampilan dari komponen, dan aturan form dari server.
 * Form tetap tersedia saat daftar gagal dimuat, supaya versi pertama tetap bisa ditulis.
 */
export default function RubricsPage() {
  const { showToast } = useToast();
  const versions = useRubricVersions();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Rubrik penilaian</h1>
        <p className="text-sm text-slate-500">
          Versi rubrik tidak pernah diubah. Perubahan dibuat sebagai versi baru, dan hasil lama tetap memakai versinya.
        </p>
      </header>

      {versions.status === "loading" && <LoadingSkeleton />}
      {versions.status === "error" && <ErrorState message={versions.message} onRetry={versions.reload} />}
      {versions.status === "ready" && <RubricVersionList versions={versions.data} />}

      <RubricVersionForm
        onCreated={(created) => {
          versions.reload();
          showToast(`Versi ${created.version_no} berhasil dibuat.`);
        }}
      />
    </div>
  );
}
