"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { CreateManualSessionForm } from "@/components/manual-runs/CreateManualSessionForm";
import { useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";

const COPY = messages({
  id: {
    list: "Pengukuran Manual",
    crumb: "Buat Pengukuran Manual",
    title: "Buat Pengukuran Manual",
    description: "Admin membuat sesi pengukuran manual untuk diisi oleh tim legal dari platform AI tanpa akses API.",
  },
  en: {
    list: "Manual measurement",
    crumb: "Create a manual measurement",
    title: "Create a manual measurement",
    description: "An Admin creates a manual measurement session for the legal team to fill in from an AI platform without API access.",
  },
});

/**
 * Halaman pembuatan sesi pengukuran manual (PBI-22 AC1).
 * Hanya dapat diakses oleh Admin.
 */
export default function NewManualMeasurementPage() {
  const copy = useText(COPY);
  const auth = useAuth();
  const router = useRouter();

  const isAuthenticated = auth.status === "authenticated";
  const isAdmin = isAuthenticated && auth.user.role === "admin";

  useEffect(() => {
    if (isAuthenticated && !isAdmin) {
      router.replace("/forbidden");
    }
  }, [isAuthenticated, isAdmin, router]);

  if (!isAuthenticated) {
    return <LoadingState />;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Breadcrumb
        items={[
          { label: copy.list, onClick: () => router.push("/manual-runs") },
          { label: copy.crumb },
        ]}
      />

      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">
          {copy.title}
        </h1>
        <p className="text-sm text-slate-500">{copy.description}</p>
      </header>

      <CreateManualSessionForm />
    </div>
  );
}
