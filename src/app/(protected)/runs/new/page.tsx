"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { CreateMeasurementForm } from "@/components/measurements/CreateMeasurementForm";

export default function NewMeasurementPage() {
  const auth = useAuth();
  const router = useRouter();

  const isAuthenticated = auth.status === "authenticated";
  const isAllowed =
    isAuthenticated &&
    (auth.user.role === "admin" || auth.user.role === "developer_ai");

  useEffect(() => {
    if (isAuthenticated && !isAllowed) {
      router.replace("/forbidden");
    }
  }, [isAuthenticated, isAllowed, router]);

  if (!isAuthenticated) {
    return <LoadingState />;
  }

  if (!isAllowed) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Eksekusi", onClick: () => router.push("/runs") },
          { label: "Buat Pengukuran" },
        ]}
      />

      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">
          Buat Pengukuran Otomatis
        </h1>
        <p className="text-sm text-slate-500">
          Admin dan Developer AI menjalankan pengujian otomatis model AI ke kumpulan
          kasus hukum (PBI-11).
        </p>
      </header>

      <CreateMeasurementForm />
    </div>
  );
}
