"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { CreateManualSessionForm } from "@/components/manual-runs/CreateManualSessionForm";

/**
 * Halaman pembuatan sesi pengukuran manual (PBI-22 AC1).
 * Hanya dapat diakses oleh Admin.
 */
export default function NewManualMeasurementPage() {
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
          { label: "Pengukuran Manual", onClick: () => router.push("/manual-runs") },
          { label: "Buat Pengukuran Manual" },
        ]}
      />

      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">
          Buat Pengukuran Manual
        </h1>
        <p className="text-sm text-slate-500">
          Admin membuat sesi pengukuran manual untuk diisi oleh tim legal dari platform AI tanpa akses API.
        </p>
      </header>

      <CreateManualSessionForm />
    </div>
  );
}
