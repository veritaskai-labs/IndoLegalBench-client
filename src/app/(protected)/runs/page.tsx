"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/hooks/useAuth";

export default function RunsPage() {
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
    <div className="mx-auto max-w-5xl space-y-6">
      <Breadcrumb items={[{ label: "Eksekusi" }]} />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            Eksekusi Pengukuran
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Kelola dan pantau jalannya pengukuran performa produk AI.
          </p>
        </div>
        <Link
          href="/runs/new"
          className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 transition-colors"
        >
          Pengukuran Baru
        </Link>
      </header>

      <div className="rounded-xl border border-slate-200 bg-white p-8">
        <EmptyState
          title="Belum ada riwayat pengukuran"
          description="Daftar riwayat sesi pengukuran sedang dikembangkan (PBI-13). Klik tombol di bawah untuk membuat pengukuran baru."
          action={{
            label: "Buat Pengukuran Baru",
            onClick: () => router.push("/runs/new"),
          }}
        />
      </div>
    </div>
  );
}
