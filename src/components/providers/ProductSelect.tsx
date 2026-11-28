"use client";

import { useEffect, useId } from "react";
import { useRouter } from "next/navigation";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import { useProductOptions, type ProductOptionsApi } from "@/hooks/useProductOptions";
import { useText } from "@/lib/i18n/LocaleProvider";
import { messages } from "@/lib/i18n/locale";
import type { ProductPurpose } from "@/types/provider";

type Props = {
  purpose: ProductPurpose;
  /** Id produk terpilih; string kosong berarti belum memilih. */
  value: string;
  onChange: (productId: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  api?: ProductOptionsApi;
};

const BOX = "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

const COPY = messages({
  id: {
    label: "Produk AI",
    loadFailed: "Gagal memuat.",
    loading: "Memuat produk…",
    empty: "Belum ada produk yang aktif.",
    placeholder: "Pilih produk",
  },
  en: {
    label: "AI product",
    loadFailed: "Could not load.",
    loading: "Loading products…",
    empty: "No active product yet.",
    placeholder: "Choose a product",
  },
});

/** Pemilih produk AI per tujuan (AC7, AC8); dipakai PBI-11 dan PBI-22. */
export function ProductSelect({
  purpose,
  value,
  onChange,
  label,
  required = false,
  disabled = false,
  api,
}: Readonly<Props>) {
  const id = useId();
  const copy = useText(COPY);
  const shownLabel = label ?? copy.label;
  const router = useRouter();
  const auth = useAuth();
  const role = auth.status === "authenticated" ? auth.user.role : null;
  const options = useProductOptions(purpose, role, api);
  const forbidden = auth.status === "authenticated" && options.status === "not_allowed";

  useEffect(() => {
    // Pengecualian: navigasi di sini agar peran tanpa hak tidak menunggu 403.
    if (forbidden) router.replace("/forbidden");
  }, [forbidden, router]);

  if (forbidden) return null;

  function control() {
    if (options.status === "error") {
      return <ErrorState message={copy.loadFailed} onRetry={options.reload} className="mt-1" />;
    }
    if (options.status !== "ready") {
      return (
        <output className={`${BOX} flex items-center gap-2 text-slate-500`}>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
          <span>{copy.loading}</span>
        </output>
      );
    }
    if (options.options.length === 0) {
      return <p className="mt-1 text-sm text-slate-500">{copy.empty}</p>;
    }
    return (
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        disabled={disabled}
        className={BOX}
      >
        <option value="">{copy.placeholder}</option>
        {options.options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {shownLabel}
      </label>
      {control()}
    </div>
  );
}
