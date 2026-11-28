"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ImportGuide } from "@/components/cases/import/ImportGuide";
import { SuiteCaseNav } from "@/components/cases/SuiteCaseNav";
import { ImportSummaryView } from "@/components/cases/import/ImportSummaryView";
import { ImportUploadForm } from "@/components/cases/import/ImportUploadForm";
import { TemplateDownloadButton } from "@/components/cases/import/TemplateDownloadButton";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { useAuth } from "@/hooks/useAuth";
import { importGateway } from "@/lib/cases/importApi";
import { importErrorMessage } from "@/lib/cases/importErrors";
import { canImportCases } from "@/lib/cases/permissions";
import type { ImportSummary } from "@/types/caseImport";

const PAGE_PATH = "/cases/import";
const SECONDARY =
  "w-full rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 sm:w-auto";

/**
 * Langkah 2 dan hasilnya. Ringkasan yang baru diterima dipakai langsung; ?batch=<id> di alamat membuat
 * ringkasan bisa dibuka lagi setelah halaman dimuat ulang (GET /case-imports/{batch_id}).
 */
function ImportWorkspace() {
  const router = useRouter();
  const batchInAddress = useSearchParams().get("batch");
  const [imported, setImported] = useState<ImportSummary | null>(null);
  // Batch yang ditinggalkan lewat "Impor berkas lain" atau "Kembali": diabaikan walau alamat belum berganti.
  const [leftBatch, setLeftBatch] = useState<string | null>(null);
  const batchToRead = imported === null && batchInAddress !== leftBatch ? batchInAddress : null;

  const stored = useAsyncResource<ImportSummary | null>(
    batchToRead ?? "",
    () => (batchToRead === null ? Promise.resolve(null) : importGateway.readSummary(batchToRead)),
    importErrorMessage,
  );

  function showImported(summary: ImportSummary) {
    setImported(summary);
    router.replace(`${PAGE_PATH}?batch=${encodeURIComponent(summary.batch_id)}`, { scroll: false });
  }

  function backToForm() {
    setLeftBatch(batchInAddress);
    setImported(null);
    router.replace(PAGE_PATH, { scroll: false });
  }

  const summary = imported ?? (batchToRead !== null && stored.status === "ready" ? stored.data : null);

  if (summary !== null) {
    return (
      <div className="space-y-3">
        <ImportSummaryView key={summary.batch_id} summary={summary} />
        <button type="button" className={SECONDARY} onClick={backToForm}>
          Impor berkas lain
        </button>
      </div>
    );
  }

  if (batchToRead !== null) {
    if (stored.status === "error") {
      return (
        <div className="space-y-3">
          <ErrorState variant="card" message={stored.message} onRetry={stored.reload} />
          <button type="button" className={SECONDARY} onClick={backToForm}>
            Kembali ke formulir
          </button>
        </div>
      );
    }
    return <LoadingState label="Memuat ringkasan impor…" />;
  }

  return (
    <div className="space-y-4">
      <section aria-labelledby="langkah-unggah" className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h2 id="langkah-unggah" className="text-base font-semibold text-slate-900">
          Langkah 2: Unggah berkas
        </h2>
        <ImportUploadForm gateway={importGateway} onImported={showImported} />
      </section>
      <EmptyState
        title="Belum ada berkas yang diimpor"
        description="Ringkasan berhasil, gagal, dan dilewati muncul di sini setelah berkas diunggah."
      />
    </div>
  );
}

/**
 * Halaman impor kasus dari CSV (PBI-4 SCRUM-340, D7). Hanya Kontributor dan Admin (D9); peran lain dialihkan ke
 * /forbidden. Ini hanya tampilan: server tetap menjawab 403 untuk peran lain.
 */
export default function CaseImportPage() {
  const auth = useAuth();
  const router = useRouter();
  const isAuthenticated = auth.status === "authenticated";
  const allowed = canImportCases(isAuthenticated ? auth.user.role : null);

  useEffect(() => {
    if (isAuthenticated && !allowed) router.replace("/forbidden");
  }, [isAuthenticated, allowed, router]);

  if (!isAuthenticated) return <LoadingState />;
  if (!allowed) return null;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-serif text-4xl leading-10 text-ink">Impor kasus dari CSV</h1>
        <p className="mt-2 text-sm text-muted">
          Untuk migrasi awal kasus lama. Maks. 500 baris per berkas. Kasus masuk sebagai draf ke satu suite sementara,
          lalu dilengkapi dan diajukan review.
        </p>
      </header>

      <SuiteCaseNav current="/cases/import" />

      <section aria-labelledby="langkah-template" className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
        <h2 id="langkah-template" className="text-base font-semibold text-slate-900">
          Langkah 1: Unduh template
        </h2>
        <p className="text-sm text-slate-600">
          Template berisi baris judul kolom saja. Isi kasus mulai baris kedua, satu kasus per baris.
        </p>
        <TemplateDownloadButton gateway={importGateway} />
      </section>

      <ImportGuide />

      {/* useSearchParams butuh Suspense supaya halaman tetap bisa di-prerender saat build. */}
      <Suspense fallback={<LoadingState />}>
        <ImportWorkspace />
      </Suspense>
    </div>
  );
}
