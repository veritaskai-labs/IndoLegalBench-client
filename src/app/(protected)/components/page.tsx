"use client";

import { useState } from "react";
import {
  CaseCard,
  MetricCard,
  ProviderCard,
  LoadingSkeleton,
  EmptyState,
  ErrorState,
} from "@/components/ui";

export default function UIComponentsCatalogPage() {
  const [retryCount, setRetryCount] = useState(0);

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-12 bg-slate-50 min-h-screen text-slate-800">
      {/* Header Halaman */}
      <div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-1">
          Katalog Komponen UI (PBI-2 SCRUM-101)
        </h1>
        <p className="text-xs text-slate-500">
          Pratinjau visual kartu desain sistem, skeleton loading, kondisi kosong, dan pesan galat.
        </p>
      </div>

      {/* Bagian 1: Desain Sistem Kartu */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">
            1. Cards (Kasus, Metrik, dan Provider)
          </h2>
          <p className="text-[11px] text-slate-500">
            Tiga tipe kartu memakai border 1px dan tanpa efek bayangan (shadow).
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Case Card */}
          <div className="space-y-2">
            <span className="text-[11px] font-medium text-slate-400">Case card</span>
            <CaseCard
              id="ILB-PT-0142"
              title="Kewajiban notifikasi PHK pada perusahaan dengan 50 pekerja"
              status="In review"
              axis="akurasi pasal"
              tag="dev"
              version="v3"
              author="Rina Hapsari"
              updatedAt="2 hari lalu"
              onOpen={() => alert("Membuka detail kasus ILB-PT-0142")}
            />
          </div>

          {/* Metric Card */}
          <div className="space-y-2">
            <span className="text-[11px] font-medium text-slate-400">Metric card</span>
            <MetricCard
              label="Pass rate · AiYU AI Agent"
              value="78,4%"
              delta="+4,1 pt"
              progressPercent={78.4}
              sampleInfo="N=3 · suite v4 · test set (120 kasus)"
              note="error rate 2,1% dilaporkan terpisah"
            />
          </div>

          {/* Provider Card */}
          <div className="space-y-2">
            <span className="text-[11px] font-medium text-slate-400">Provider card</span>
            <ProviderCard
              name="Provider AI hukum"
              rpm={60}
              version="v2026.08"
              tosReviewed={true}
              keyEncrypted={true}
            />
          </div>
        </div>
      </section>

      {/* Bagian 2: Loading Skeletons */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">2. LoadingSkeleton</h2>
          <p className="text-[11px] text-slate-500">
            Placeholder animasi untuk baris teks, tabel, dan kartu.
          </p>
        </div>

        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded p-4">
            <span className="text-[11px] font-medium text-slate-400 block mb-3">Varian Baris (Lines):</span>
            <LoadingSkeleton variant="lines" rows={3} />
          </div>

          <div className="bg-white border border-slate-200 rounded overflow-hidden">
            <span className="text-[11px] font-medium text-slate-400 block p-4 pb-2">Varian Baris Tabel:</span>
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-700 font-semibold">
                  <th className="py-3 px-6">ID Kasus</th>
                  <th className="py-3 px-6">Nama Kasus</th>
                  <th className="py-3 px-6">Sumbu</th>
                  <th className="py-3 px-6">Status</th>
                  <th className="py-3 px-6 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <LoadingSkeleton variant="table" rows={3} columns={5} />
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-[11px] font-medium text-slate-400 block mb-2">
                Varian Kartu (Cards - Case Card Skeleton):
              </span>
              <LoadingSkeleton variant="cards" cardType="case" rows={3} />
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 block mb-2">
                Varian Kartu (Cards - Metric Card Skeleton):
              </span>
              <LoadingSkeleton variant="cards" cardType="metric" rows={3} />
            </div>

            <div>
              <span className="text-[11px] font-medium text-slate-400 block mb-2">
                Varian Kartu (Cards - Provider Card Skeleton):
              </span>
              <LoadingSkeleton variant="cards" cardType="provider" rows={3} />
            </div>
          </div>
        </div>
      </section>

      {/* Bagian 3: Empty State */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">3. EmptyState</h2>
          <p className="text-[11px] text-slate-500">Tampilan saat data kosong atau pencarian nihil.</p>
        </div>

        <div className="bg-white border border-slate-200 rounded">
          <EmptyState
            title="Tidak ada kasus ditemukan"
            description="Belum ada kasus hukum yang terdaftar dalam suite ini. Mulai dengan membuat kasus baru."
            action={{
              label: "Tambah Kasus",
              onClick: () => alert("Aksi tambah kasus dipicu"),
            }}
          />
        </div>
      </section>

      {/* Bagian 4: Error State */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h2 className="text-sm font-semibold text-slate-900">4. ErrorState</h2>
          <p className="text-[11px] text-slate-500">Banner inline dan kartu lengkap dengan tombol aksi coba lagi.</p>
        </div>

        <div className="space-y-4">
          <ErrorState
            variant="banner"
            message="Error memuat data: Gagal menghubungi server (HTTP 500)"
            onRetry={() => setRetryCount((prev) => prev + 1)}
          />

          <ErrorState
            variant="card"
            message="Sesi otentikasi berakhir atau koneksi terputus. Silakan muat ulang komponen."
            onRetry={() => setRetryCount((prev) => prev + 1)}
          />

          {retryCount > 0 && (
            <p className="text-xs text-indigo-600 font-medium text-center">
              Tombol &quot;Coba lagi&quot; ditekan sebanyak: {retryCount} kali
            </p>
          )}
        </div>
      </section>
    </div>
  );
}