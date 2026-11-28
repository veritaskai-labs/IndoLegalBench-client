"use client";

import { useCallback, useEffect, useState } from "react";
import { DeleteProductDialog } from "@/components/providers/DeleteProductDialog";
import { ProviderFormDialog } from "@/components/providers/ProviderFormDialog";
import { ToggleActiveDialog } from "@/components/providers/ToggleActiveDialog";
import { CredentialHint } from "@/components/ui/CredentialHint";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui";
import { useToast } from "@/components/ui/Toast";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import { describeConnectionFailure } from "@/lib/providers/connectionMessage";
import { listProducts, testConnection } from "@/lib/providers/providerApi";
import { formatDate, formatDateTime, formatRupiah, formatRupiahDown, measurementTypeLabel, PROVIDER_TYPE_LABEL } from "@/lib/providers/format";
import { isMeasurementTypeLocked, mergeSavedProduct } from "@/lib/providers/productUsage";
import type { AiProduct, AiProductListItem, MeasurementType } from "@/types/provider";

type Dialog =
  | { mode: "closed" }
  | { mode: "create" }
  | { mode: "edit"; product: AiProductListItem }
  | { mode: "toggle"; product: AiProductListItem }
  | { mode: "delete"; product: AiProductListItem };

type ListState = { status: "loading" } | { status: "ready"; products: AiProductListItem[] } | { status: "error" };

/** Hasil uji koneksi terakhir di sesi ini; latency hanya ada di balasan, tidak disimpan server. */
type LiveResult =
  | { status: "ok"; latencyMs: number }
  /** Alasan gagal dibaca dari field last_test_* milik produk. */
  | { status: "failed" }
  /** Permintaan uji koneksi sendiri gagal (jaringan, server); hasil tersimpan tidak berubah. */
  | { status: "error" };

const COLUMNS = 13;

/** Filter jenis pengukuran (PBI-23 AC6); "all" berarti tanpa filter. */
type TypeFilter = MeasurementType | "all";

const COPY = messages({
  id: {
    title: "Produk AI",
    intro: "Produk yang diukur beserta batas pemakaiannya. Kredensial tidak pernah ditampilkan lagi.",
    register: "Daftarkan produk",
    statusTabs: "Status produk",
    active: "Aktif",
    inactive: "Nonaktif",
    typePrefix: "Jenis:",
    typeFilter: "Jenis pengukuran",
    filterAll: "Semua",
    loadFailed: "Gagal memuat produk AI.",
    emptyActive: "Belum ada produk AI aktif",
    emptyInactive: "Tidak ada produk AI nonaktif",
    emptyActiveAutomatic: "Belum ada produk AI otomatis yang aktif",
    emptyActiveManual: "Belum ada produk AI manual yang aktif",
    emptyInactiveAutomatic: "Tidak ada produk AI otomatis yang nonaktif",
    emptyInactiveManual: "Tidak ada produk AI manual yang nonaktif",
    emptyActiveDescription: "Daftarkan produk pertama yang akan diukur.",
    emptyInactiveDescription: "Produk yang dinonaktifkan muncul di sini.",
    colName: "Nama",
    colType: "Jenis",
    colProvider: "Penyedia / jenis API",
    colModel: "Model",
    colCredential: "Kredensial",
    colLimit: "Limit/menit",
    colBudget: "Budget/bulan",
    colRemaining: "Sisa anggaran bulan ini",
    colSessions: "Jumlah sesi",
    colStatus: "Status",
    colLastTest: "Uji terakhir",
    colRegistered: "Didaftarkan",
    colActions: "Aksi",
    notApplicable: "Tidak berlaku",
    testingConnection: "Menguji koneksi, bisa sampai 15 detik…",
    testRequestFailed: "Uji koneksi tidak bisa dijalankan saat ini. Tunggu sebentar, lalu coba lagi.",
    neverTested: "Belum pernah diuji",
    succeeded: "Berhasil",
    latency: " · {ms} ms",
    failed: "Gagal: {reason}",
    seeDetails: "Lihat detail",
    test: "Uji koneksi",
    testing: "Menguji…",
    testAria: "Uji koneksi {name}",
    edit: "Ubah",
    editAria: "Ubah {name}",
    deactivate: "Nonaktifkan",
    deactivateAria: "Nonaktifkan {name}",
    activate: "Aktifkan",
    activateAria: "Aktifkan {name}",
    delete: "Hapus",
    deleteAria: "Hapus {name}",
    savedToast: "Produk AI tersimpan",
    registeredToast: "Produk AI terdaftar",
    activatedToast: "Produk AI diaktifkan",
    deactivatedToast: "Produk AI dinonaktifkan",
    deletedToast: "{name} dihapus",
  },
  en: {
    title: "AI products",
    intro: "The products being measured, and their usage limits. Credentials are never shown again.",
    register: "Register product",
    statusTabs: "Product status",
    active: "Active",
    inactive: "Inactive",
    typePrefix: "Type:",
    typeFilter: "Measurement type",
    filterAll: "All",
    loadFailed: "Could not load AI products.",
    emptyActive: "No active AI products yet",
    emptyInactive: "No inactive AI products",
    emptyActiveAutomatic: "No active automatic AI products yet",
    emptyActiveManual: "No active manual AI products yet",
    emptyInactiveAutomatic: "No inactive automatic AI products",
    emptyInactiveManual: "No inactive manual AI products",
    emptyActiveDescription: "Register the first product to measure.",
    emptyInactiveDescription: "Deactivated products show up here.",
    colName: "Name",
    colType: "Type",
    colProvider: "Provider / API type",
    colModel: "Model",
    colCredential: "Credential",
    colLimit: "Limit/minute",
    colBudget: "Budget/month",
    colRemaining: "Remaining budget this month",
    colSessions: "Session count",
    colStatus: "Status",
    colLastTest: "Last test",
    colRegistered: "Registered",
    colActions: "Actions",
    notApplicable: "Not applicable",
    testingConnection: "Testing the connection. This can take up to 15 seconds…",
    testRequestFailed: "The connection test cannot run right now. Wait a moment, then try again.",
    neverTested: "Not tested yet",
    succeeded: "Succeeded",
    latency: " · {ms} ms",
    failed: "Failed: {reason}",
    seeDetails: "See details",
    test: "Test connection",
    testing: "Testing…",
    testAria: "Test connection {name}",
    edit: "Edit",
    editAria: "Edit {name}",
    deactivate: "Deactivate",
    deactivateAria: "Deactivate {name}",
    activate: "Activate",
    activateAria: "Activate {name}",
    delete: "Delete",
    deleteAria: "Delete {name}",
    savedToast: "AI product saved",
    registeredToast: "AI product registered",
    activatedToast: "AI product activated",
    deactivatedToast: "AI product deactivated",
    deletedToast: "{name} deleted",
  },
});

const TYPE_BADGE: Record<MeasurementType, string> = {
  automatic: "bg-indigo-50 text-indigo-800",
  manual: "bg-amber-50 text-amber-800",
};

function emptyTitle(active: boolean, type: TypeFilter, copy: (typeof COPY)["id"]): string {
  if (type === "all") return active ? copy.emptyActive : copy.emptyInactive;
  if (type === "automatic") return active ? copy.emptyActiveAutomatic : copy.emptyInactiveAutomatic;
  return active ? copy.emptyActiveManual : copy.emptyInactiveManual;
}

/**
 * Registri produk AI (SCRUM-117). Rutenya /admin/providers, sama dengan API
 * dan tautan sidebar; tiket menulis /admin/ai-products.
 */
export default function ProvidersPage() {
  const locale = useLocale();
  const copy = useText(COPY);
  const { showToast } = useToast();
  const [active, setActive] = useState(true);
  const [type, setType] = useState<TypeFilter>("all");
  const [list, setList] = useState<ListState>({ status: "loading" });
  const [nonce, setNonce] = useState(0);
  const [dialog, setDialog] = useState<Dialog>({ mode: "closed" });
  const [testing, setTesting] = useState<ReadonlySet<string>>(new Set());
  const [results, setResults] = useState<Record<string, LiveResult>>({});
  const typeFilters: readonly { value: TypeFilter; label: string }[] = [
    { value: "all", label: copy.filterAll },
    { value: "automatic", label: measurementTypeLabel("automatic", locale) },
    { value: "manual", label: measurementTypeLabel("manual", locale) },
  ];

  const reload = useCallback(() => {
    setList({ status: "loading" });
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (type === "all" ? listProducts(active) : listProducts(active, type))
      .then((products) => {
        if (!cancelled) setList({ status: "ready", products });
      })
      .catch(() => {
        if (!cancelled) setList({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [active, type, nonce]);

  function switchTab(next: boolean) {
    if (next === active) return;
    setList({ status: "loading" });
    setActive(next);
  }

  function switchType(next: TypeFilter) {
    if (next === type) return;
    setList({ status: "loading" });
    setType(next);
  }

  function replaceRow(saved: AiProductListItem) {
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

  /** Balasan simpan tidak membawa kolom turunan; kalau nilainya tidak lagi pasti, muat ulang. */
  function applySaved(before: AiProductListItem, saved: AiProduct) {
    const merged = mergeSavedProduct(before, saved);
    if (merged) replaceRow(merged);
    else reload();
  }

  async function runTest(product: AiProductListItem) {
    setTesting((ids) => new Set(ids).add(product.id));
    try {
      const result = await testConnection(product.id);
      const live: LiveResult =
        result.status === "ok" ? { status: "ok", latencyMs: result.latency_ms ?? 0 } : { status: "failed" };
      setResults((all) => ({ ...all, [product.id]: live }));
      replaceRow({
        ...product,
        last_test_at: new Date().toISOString(),
        last_test_status: result.status,
        last_test_message: result.status === "ok" ? null : (result.message ?? null),
        last_test_error_category: result.status === "ok" ? null : (result.error_category ?? null),
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

  const rows = list.status === "ready" ? list.products : [];
  const isEmpty = list.status === "ready" && rows.length === 0;
  const hasRows = rows.length > 0;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{copy.title}</h1>
          <p className="text-sm text-slate-500">{copy.intro}</p>
        </div>
        <button
          type="button"
          onClick={() => setDialog({ mode: "create" })}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          {copy.register}
        </button>
      </header>

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-200">
        <div role="tablist" aria-label={copy.statusTabs} className="flex gap-2">
          {[
            { value: true, label: copy.active },
            { value: false, label: copy.inactive },
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
        <div className="mb-2 flex items-center gap-2 text-sm text-slate-600">
          <span aria-hidden="true">{copy.typePrefix}</span>
          <fieldset aria-label={copy.typeFilter} className="m-0 inline-flex min-w-0 rounded-md border border-slate-300 p-0.5">
            {typeFilters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                aria-pressed={type === filter.value}
                onClick={() => switchType(filter.value)}
                className={`rounded px-3 py-1 text-sm font-medium ${
                  type === filter.value ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </fieldset>
        </div>
      </div>

      {list.status === "error" && <ErrorState variant="card" message={copy.loadFailed} onRetry={reload} />}

      {/* Outside the table: inside a cell the message is centred across the table's full
          width, off a phone screen (SCRUM-204 E2E F5). */}
      {isEmpty && (
        <div className="rounded-lg border border-slate-200 bg-white">
          <EmptyState
            title={emptyTitle(active, type, copy)}
            description={active ? copy.emptyActiveDescription : copy.emptyInactiveDescription}
            action={active ? { label: copy.register, onClick: () => setDialog({ mode: "create" }) } : undefined}
          />
        </div>
      )}

      {(list.status === "loading" || hasRows) && (
        // relative: the sr-only cell labels are position: absolute; without a positioned
        // scroll box they escape it and widen the whole page (SCRUM-204 E2E F2).
        <div className="relative overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700">
              <tr>
                <th scope="col" className="px-3 py-2.5">{copy.colName}</th>
                <th scope="col" className="px-3 py-2.5">{copy.colType}</th>
                <th scope="col" className="px-3 py-2.5">{copy.colProvider}</th>
                <th scope="col" className="px-3 py-2.5">{copy.colModel}</th>
                <th scope="col" className="px-3 py-2.5">{copy.colCredential}</th>
                <th scope="col" className="px-3 py-2.5">{copy.colLimit}</th>
                <th scope="col" className="px-3 py-2.5">{copy.colBudget}</th>
                <th scope="col" className="px-3 py-2.5">{copy.colRemaining}</th>
                <th scope="col" className="px-3 py-2.5">{copy.colSessions}</th>
                <th scope="col" className="px-3 py-2.5">{copy.colStatus}</th>
                <th scope="col" className="px-3 py-2.5">{copy.colLastTest}</th>
                <th scope="col" className="px-3 py-2.5">{copy.colRegistered}</th>
                <th scope="col" className="px-3 py-2.5">
                  <span className="sr-only">{copy.colActions}</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.status === "loading" && <LoadingSkeleton variant="table" rows={3} columns={COLUMNS} />}
              {rows.map((product) => (
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
          typeLocked={dialog.mode === "edit" && isMeasurementTypeLocked(dialog.product)}
          onClose={() => setDialog({ mode: "closed" })}
          onSaved={(saved) => {
            setDialog({ mode: "closed" });
            showToast(dialog.mode === "edit" ? copy.savedToast : copy.registeredToast);
            if (dialog.mode === "edit") applySaved(dialog.product, saved);
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
            showToast(saved.is_active ? copy.activatedToast : copy.deactivatedToast);
            applySaved(dialog.product, saved);
          }}
        />
      )}

      {dialog.mode === "delete" && (
        <DeleteProductDialog
          product={dialog.product}
          onClose={() => setDialog({ mode: "closed" })}
          onDone={() => {
            setDialog({ mode: "closed" });
            showToast(fill(copy.deletedToast, { name: dialog.product.name }));
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
}: Readonly<{
  product: AiProductListItem;
  testing: boolean;
  live: LiveResult | undefined;
  onTest: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}>) {
  const locale = useLocale();
  const copy = useText(COPY);
  // Produk manual: kolom API dan uji koneksi tidak berlaku.
  const manual = product.measurement_type === "manual";
  return (
    <tr className="align-top">
      <td className="px-3 py-2.5 font-medium text-slate-900">{product.name}</td>
      <td className="px-3 py-2.5">
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${TYPE_BADGE[product.measurement_type]}`}>
          {measurementTypeLabel(product.measurement_type, locale)}
        </span>
      </td>
      <td className="px-3 py-2.5 text-slate-600">
        {product.vendor_label ?? (product.provider_type && PROVIDER_TYPE_LABEL[product.provider_type])}
      </td>
      <td className="px-3 py-2.5 font-mono text-xs text-slate-600">{manual ? <NotApplicable /> : product.model_name}</td>
      <td className="px-3 py-2.5">
        {manual ? <NotApplicable /> : product.credential_hint != null && <CredentialHint hint={product.credential_hint} />}
      </td>
      <td className="px-3 py-2.5 text-slate-600">{manual ? <NotApplicable /> : product.rate_limit_per_minute}</td>
      <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
        {manual ? <NotApplicable /> : product.monthly_budget_idr != null && formatRupiah(product.monthly_budget_idr)}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">
        {manual || product.remaining_budget_idr == null ? <NotApplicable /> : formatRupiahDown(product.remaining_budget_idr)}
      </td>
      {/* Produk manual juga punya sesi (PBI-22). Termasuk sesi yang diarsipkan. */}
      <td className="px-3 py-2.5 text-slate-600">{product.session_count}</td>
      <td className="px-3 py-2.5">
        <span
          className={`rounded px-2 py-0.5 text-xs font-medium ${
            product.is_active ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"
          }`}
        >
          {product.is_active ? copy.active : copy.inactive}
        </span>
      </td>
      <td className="max-w-xs px-3 py-2.5 text-xs" aria-live="polite">
        {manual ? <NotApplicable /> : <LastTest product={product} testing={testing} live={live} />}
      </td>
      <td className="px-3 py-2.5 whitespace-nowrap text-slate-600">{formatDate(product.created_at)}</td>
      <td className="px-3 py-2.5">
        <div className="grid grid-cols-[auto_auto] justify-start gap-x-3 gap-y-1 text-xs font-medium whitespace-nowrap">
          {!manual && (
            <button
              type="button"
              onClick={onTest}
              disabled={testing}
              aria-label={fill(copy.testAria, { name: product.name })}
              className="text-slate-900 hover:underline disabled:opacity-50"
            >
              {testing ? copy.testing : copy.test}
            </button>
          )}
          <button
            type="button"
            onClick={onEdit}
            aria-label={fill(copy.editAria, { name: product.name })}
            className="text-slate-900 hover:underline"
          >
            {copy.edit}
          </button>
          <button
            type="button"
            onClick={onToggle}
            aria-label={fill(product.is_active ? copy.deactivateAria : copy.activateAria, { name: product.name })}
            className={product.is_active ? "text-red-700 hover:underline" : "text-slate-900 hover:underline"}
          >
            {product.is_active ? copy.deactivate : copy.activate}
          </button>
          <button
            type="button"
            onClick={onDelete}
            aria-label={fill(copy.deleteAria, { name: product.name })}
            className="text-red-700 hover:underline"
          >
            {copy.delete}
          </button>
        </div>
      </td>
    </tr>
  );
}

function NotApplicable() {
  const copy = useText(COPY);
  return (
    <span className="font-sans text-sm text-slate-400">
      <span aria-hidden="true">—</span>
      <span className="sr-only">{copy.notApplicable}</span>
    </span>
  );
}

function LastTest({
  product,
  testing,
  live,
}: Readonly<{ product: AiProduct; testing: boolean; live: LiveResult | undefined }>) {
  const locale = useLocale();
  const copy = useText(COPY);
  if (testing) return <span className="text-slate-500">{copy.testingConnection}</span>;
  if (live?.status === "error") {
    return <span className="text-red-700">{copy.testRequestFailed}</span>;
  }
  if (product.last_test_status == null || product.last_test_at == null) {
    return <span className="text-slate-400">{copy.neverTested}</span>;
  }
  const when = formatDateTime(product.last_test_at);
  if (product.last_test_status === "ok") {
    return (
      <span className="text-emerald-700">
        {copy.succeeded}
        {live?.status === "ok" ? fill(copy.latency, { ms: live.latencyMs }) : ""}
        <span className="block text-slate-400">{when}</span>
      </span>
    );
  }
  const failure = describeConnectionFailure(product.last_test_error_category, locale);
  return (
    <div className="space-y-1">
      <p className="text-red-700">{fill(copy.failed, { reason: failure.title })}</p>
      {failure.hint && <p className="text-slate-600">{failure.hint}</p>}
      {product.last_test_message && (
        <details className="text-slate-500">
          <summary className="cursor-pointer hover:text-slate-700">{copy.seeDetails}</summary>
          <p className="mt-1 font-mono break-words">{product.last_test_message}</p>
        </details>
      )}
      <p className="text-slate-400">{when}</p>
    </div>
  );
}
