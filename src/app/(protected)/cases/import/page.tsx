"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { ImportGuide } from "@/components/cases/import/ImportGuide";
import { TemplateDownloadButton } from "@/components/cases/import/TemplateDownloadButton";
import { LoadingState } from "@/components/ui";
import { useAuth } from "@/hooks/useAuth";
import { importGateway } from "@/lib/cases/importApi";
import { canImportCases } from "@/lib/cases/permissions";

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
      <header className="space-y-1">
        <h1 className="text-xl font-semibold text-slate-900">Impor kasus dari CSV</h1>
        <p className="text-sm text-slate-600">
          Untuk migrasi awal kasus lama. Maks. 500 baris per berkas. Kasus masuk sebagai draf ke satu suite sementara,
          lalu dilengkapi dan diajukan review.
        </p>
      </header>

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
    </div>
  );
}
