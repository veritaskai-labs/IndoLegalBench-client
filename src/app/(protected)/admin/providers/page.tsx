"use client";

import { useCallback, useEffect, useState } from "react";
import { DeleteProductDialog } from "@/components/providers/DeleteProductDialog";
import { ProviderFormDialog } from "@/components/providers/ProviderFormDialog";
import { ToggleActiveDialog } from "@/components/providers/ToggleActiveDialog";
import { CredentialHint } from "@/components/ui/CredentialHint";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { describeConnectionFailure } from "@/lib/providers/connectionMessage";
import { listProducts, testConnection } from "@/lib/providers/providerApi";
import { formatDateTime, formatRupiah, PROVIDER_TYPE_LABEL } from "@/lib/providers/format";
import type { AiProduct } from "@/types/provider";

type Dialog =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; product: AiProduct }
  | { mode: "toggle"; product: AiProduct }
  | { mode: "delete"; product: AiProduct };

type ListState = { status: "loading" } | { status: "ready"; products: AiProduct[] } | { status: "error" };

/** Hasil uji koneksi terakhir di sesi ini; latency hanya ada di balasan, tidak disimpan server. */
type LiveResult =
  | { status: "ok"; latencyMs: number }
  /** Alasan gagal dibaca dari field last_test_* milik produk. */
  | { status: "failed" }
  /** Permintaan uji koneksi sendiri gagal (jaringan, server); hasil tersimpan tidak berubah. */
  | { status: "error" };

const COLUMNS = 9;

/**
 * Registri produk AI (SCRUM-117). Rutenya /admin/providers, sama dengan API
 * dan tautan sidebar; tiket menulis /admin/ai-products.
 */
export default function ProvidersPage() {
  const { showToast } = useToast();
  const [active, setActive] = useState(true);
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  const [dialog, setDialog] = useState<Dialog>({ mode: "closed" });
  const [testing, setTesting] = useState<ReadonlySet<string>>(new Set());
  const [results, setResults] = useState<Record<string, LiveResult>>({});

  const reload = useCallback(() => {
    setList({ status: "loading" });
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    listProducts(active)
      .then((products) => {
        if (!cancelled) setList({ status: "ready", products });
      })
      .catch(() => {
        if (!cancelled) setList({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [active, nonce]);

  function switchTab(next: boolean) {
    if (next === active) return;
    setList({ status: "loading" });
    setActive(next);
  }

  function replaceRow(saved: AiProduct) {
    setList((current) =>
      current.status !== "ready"
        ? current
        : {
            status: "ready",
            // Produk yang pindah status keluar dari tab ini.
            products: current.products
              .map((item) => (item.id === saved.id ? saved : item))
              .filter((item) => item.is_active === active),
          },
    );
  }

  function removeRow(productId: string) {
    setList((current) =>
      current.status !== "ready" ? current : { status: "ready", products: current.products.filter((item) => item.id !== productId) },
    );
  }

  async function runTest(product: AiProduct) {
    setTesting((ids) => new Set(ids).add(product.id));
    try {
      const result = await testConnection(product.id);
      const live: LiveResult =
        result.status === "ok"
          ? { status: "ok", latencyMs: result.latency_ms ?? 0 }
          : { status: "failed" };
      setResults((all) => ({ ...all, [product.id]: live }));
      replaceRow({
        ...product,
        last_test_at: new Date().toISOString(),
        last_test_status: result.status,
        last_test_message: result.status === "ok" ? null : (result.message ?? null),
        last_test_error_category:
          result.status === "ok" ? null : (result.error_category ?? null),
      });
    } catch {
      setResults((all) => ({
        ...all,
        [product.id]: { status: "error" },
      }));
    } finally {
      setTesting((ids) => {
        const next = new Set(ids);
        next.delete(product.id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Produk AI</h1>
          <p className="text-sm text-slate-500">
            Produk yang diukur beserta batas pemakaiannya. Kredensial tidak pernah ditampilkan lagi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ mode: "create" })}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Daftarkan produk
        </button>
      </header>

      <div role="tablist" aria-label="Status produk" className="flex gap-2 border-b border-slate-200">
        {[
          { value: true, label: "Aktif" },
          { value: false, label: "Nonaktif" },
        ].map((tab) => (
          <button
            key={tab.label}
            type="button"
            role="tab"
            aria-selected={active === tab.value}
            onClick={() => switchTab(tab.value)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              active === tab.value ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {list.status === "error" ? (
        <ErrorState variant="card" message="Gagal memuat produk AI." onRetry={reload} />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
              <tr>
                <th scope="col" className="px-4 py-3">Nama</th>
                <th scope="col" className="px-4 py-3">Jenis</th>
                <th scope="col" className="px-4 py-3">Model</th>
                <th scope="col" className="px-4 py-3">Kredensial</th>
                <th scope="col" className="px-4 py-3">Limit/menit</th>
                <th scope="col" className="px-4 py-3">Budget/bulan</th>
                <th scope="col" className="px-4 py-3">Status</th>
                <th scope="col" className="px-4 py-3">Uji terakhir</th>
                <th scope="col" className="px-4 py-3">
                  <span className="sr-only">Aksi</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.status === "loading" && <LoadingSkeleton variant="table" rows={3} columns={COLUMNS} />}
              {list.status === "ready" && list.products.length === 0 && (
                <EmptyState
                  inTable
                  colSpan={COLUMNS}
                  title={active ? "Belum ada produk AI aktif" : "Tidak ada produk AI nonaktif"}
                  description={active ? "Daftarkan produk pertama yang akan diukur." : "Produk yang dinonaktifkan muncul di sini."}
                  action={active ? { label: "Daftarkan produk", onClick: () => setDialog({ mode: "create" }) } : undefined}
                />
              )}
              {list.status === "ready" &&
                list.products.map((product) => (
                  <ProductRow
                    key={product.id}
                    product={product}
                    testing={testing.has(product.id)}
                    live={results[product.id]}
                    onTest={() => runTest(product)}
                    onEdit={() => setDialog({ mode: "edit", product })}
                    onToggle={() => setDialog({ mode: "toggle", product })}
                    onDelete={() => setDialog({ mode: "delete", product })}
                  />
                ))}
            </tbody>
          </table>
        </div>
      )}

      {(dialog.mode === "create" || dialog.mode === "edit") && (
        <ProviderFormDialog
          product={dialog.mode === "edit" ? dialog.product : undefined}
          onClose={() => setDialog({ mode: "closed" })}
          onSaved={(saved) => {
            setDialog({ mode: "closed" });
            showToast(dialog.mode === "edit" ? "Produk AI tersimpan" : "Produk AI terdaftar");
            if (dialog.mode === "edit") replaceRow(saved);
            else reload();
          }}
        />
      )}

      {dialog.mode === "toggle" && (
        <ToggleActiveDialog
          product={dialog.product}
          onClose={() => setDialog({ mode: "closed" })}
          onDone={(saved) => {
            setDialog({ mode: "closed" });
            showToast(saved.is_active ? "Produk AI diaktifkan" : "Produk AI dinonaktifkan");
            replaceRow(saved);
          }}
        />
      )}

      {dialog.mode === "delete" && (
        <DeleteProductDialog
          product={dialog.product}
          onClose={() => setDialog({ mode: "closed" })}
          onDone={() => {
            setDialog({ mode: "closed" });
            showToast(`${dialog.product.name} dihapus`);
            removeRow(dialog.product.id);
          }}
        />
      )}
    </div>
  );
}

function ProductRow({
  product,
  testing,
  live,
  onTest,
  onEdit,
  onToggle,
  onDelete,
}: {
  product: AiProduct;
  testing: boolean;
  live: LiveResult | undefined;
  onTest: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3 font-medium text-slate-900">{product.name}</td>
      <td className="px-4 py-3 text-slate-600">{PROVIDER_TYPE_LABEL[product.provider_type]}</td>
      <td className="px-4 py-3 font-mono text-xs text-slate-600">{product.model_name}</td>
      <td className="px-4 py-3">
        <CredentialHint hint={product.credential_hint} />
      </td>
      <td className="px-4 py-3 text-slate-600">{product.rate_limit_per_minute}</td>
      <td className="px-4 py-3 whitespace-nowrap text-slate-600">{formatRupiah(product.monthly_budget_idr)}</td>
      <td className="px-4 py-3">
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            product.is_active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"
          }`}
        >
          {product.is_active ? "Aktif" : "Nonaktif"}
        </span>
      </td>
      <td className="max-w-xs px-4 py-3 text-xs" aria-live="polite">
        <LastTest product={product} testing={testing} live={live} />
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-col items-start gap-1.5 text-xs font-medium">
          <button
            type="button"
            onClick={onTest}
            disabled={testing}
            aria-label={`Uji koneksi ${product.name}`}
            className="text-slate-900 hover:underline disabled:opacity-50"
          >
            {testing ? "Menguji…" : "Uji koneksi"}
          </button>
          <button type="button" onClick={onEdit} aria-label={`Ubah ${product.name}`} className="text-slate-900 hover:underline">
            Ubah
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={`${product.is_active ? "Nonaktifkan" : "Aktifkan"} ${product.name}`}
            className={product.is_active ? "text-red-700 hover:underline" : "text-slate-900 hover:underline"}
          >
            {product.is_active ? "Nonaktifkan" : "Aktifkan"}
          </button>
          <button type="button" onClick={onDelete} aria-label={`Hapus ${product.name}`} className="text-red-700 hover:underline">
            Hapus
          </button>
        </div>
      </td>
    </tr>
  );
}

function LastTest({ product, testing, live }: { product: AiProduct; testing: boolean; live: LiveResult | undefined }) {
  if (testing) return <span className="text-slate-500">Menguji koneksi, bisa sampai 15 detik…</span>;
  if (live?.status === "error") {
    return <span className="text-red-700">Uji koneksi tidak bisa dijalankan saat ini. Tunggu sebentar, lalu coba lagi.</span>;
  }
  if (product.last_test_status === null || product.last_test_at === null) {
    return <span className="text-slate-400">Belum pernah diuji</span>;
  }
  const when = formatDateTime(product.last_test_at);
  if (product.last_test_status === "ok") {
    return (
      <span className="text-emerald-700">
        Berhasil{live?.status === "ok" ? ` · ${live.latencyMs} ms` : ""}
        <span className="block text-slate-400">{when}</span>
      </span>
    );
  }
  const failure = describeConnectionFailure(product.last_test_error_category);
  return (
    <div className="space-y-1">
      <p className="text-red-700">Gagal: {failure.title}</p>
      {failure.hint && <p className="text-slate-600">{failure.hint}</p>}
      {product.last_test_message && (
        <details className="text-slate-500">
          <summary className="cursor-pointer hover:text-slate-700">Lihat detail</summary>
          <p className="mt-1 font-mono break-words">{product.last_test_message}</p>
        </details>
      )}
      <p className="text-slate-400">{when}</p>
    </div>
  );
}
