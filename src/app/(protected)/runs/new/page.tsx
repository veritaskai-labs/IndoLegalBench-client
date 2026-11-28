"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { CreateMeasurementForm } from "@/components/measurements/CreateMeasurementForm";
import { useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";

const COPY = messages({
  id: {
    list: "Pengukuran otomatis",
    crumb: "Buat Pengukuran",
    title: "Buat Pengukuran Otomatis",
    description: "Admin dan Developer AI menjalankan pengujian otomatis model AI ke kumpulan kasus hukum (PBI-11).",
  },
  en: {
    list: "Automatic measurement",
    crumb: "New measurement",
    title: "Create an automatic measurement",
    description: "Admins and Developer AI run an automatic test of an AI model against a set of legal cases (PBI-11).",
  },
});

export default function NewMeasurementPage() {
  const copy = useText(COPY);
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
          { label: copy.list, onClick: () => router.push("/runs") },
          { label: copy.crumb },
        ]}
      />

      <header className="space-y-1">
        <h1 className="text-xl font-bold text-slate-900">
          {copy.title}
        </h1>
        <p className="text-sm text-slate-500">{copy.description}</p>
      </header>

      <CreateMeasurementForm />
    </div>
  );
}
