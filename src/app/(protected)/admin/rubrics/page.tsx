"use client";

import Link from "next/link";

import { RubricVersionList } from "@/components/rubrics/RubricVersionList";
import { ErrorState, Icon, LoadingSkeleton } from "@/components/ui";
import { useRubricVersions } from "@/hooks/useRubricVersions";

/**
 * Rubrik penilaian (PBI-14 AC7). Rutenya /admin/rubrics, sama dengan menu dan API. SCRUM-375 A: daftar
 * versi berdiri sendiri, dan versi baru ditulis di /admin/rubrics/new seperti prototipe. Tombolnya
 * tetap ada saat daftar gagal dimuat, supaya versi pertama tetap bisa ditulis.
 */
export default function RubricsPage() {
  const versions = useRubricVersions();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-4xl leading-10 text-ink">Rubrik penilaian</h1>
          <p className="mt-2 flex items-start gap-1.5 text-sm text-muted">
            <Icon name="kunci" size={14} className="mt-[3px]" />
            <span>Versi rubrik tidak pernah diubah. Perubahan dibuat sebagai versi baru, dan hasil lama tetap memakai versinya.</span>
          </p>
        </div>
        {/* Ponsel: tombol utama lebar penuh setinggi 44 px (A3). */}
        <Link
          href="/admin/rubrics/new"
          className="inline-flex h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-control bg-ink px-3.5 text-sm text-paper transition-colors hover:bg-ink-hover sm:h-9 sm:w-auto"
        >
          <Icon name="tambah" size={14} />
          Buat versi baru
        </Link>
      </header>

      {versions.status === "loading" && <LoadingSkeleton />}
      {versions.status === "error" && <ErrorState variant="card" message={versions.message} onRetry={versions.reload} />}
      {versions.status === "ready" && <RubricVersionList versions={versions.data} />}
    </div>
  );
}
