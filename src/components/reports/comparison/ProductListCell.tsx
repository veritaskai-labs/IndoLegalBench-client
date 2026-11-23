"use client";

import { useId } from "react";

import { productColumn } from "@/lib/reports/reportRules";

/**
 * Isi kolom Produk di daftar laporan (SCRUM-364, PBI-15 AC9). Daftar panjang dipotong jadi "A, B +2"; daftar
 * lengkapnya tampil sebagai tooltip saat "+2" disorot atau difokus dengan Tab, dan dibacakan pembaca layar lewat
 * aria-describedby (WCAG 1.4.13), jadi tidak hanya untuk pengguna mouse.
 */
export function ProductListCell({ labels }: Readonly<{ labels: readonly string[] }>) {
  const column = productColumn(labels);
  const tooltipId = useId();

  if (column.hiddenCount === 0) return <span>{column.shown}</span>;
  return (
    <span className="group relative inline-flex flex-wrap items-center gap-1">
      <span>{column.shown}</span>
      <button
        type="button"
        aria-label={`+${column.hiddenCount} produk lain`}
        aria-describedby={tooltipId}
        className="rounded-full bg-slate-100 px-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
      >
        +{column.hiddenCount}
      </button>
      <span
        role="tooltip"
        id={tooltipId}
        className="pointer-events-none invisible absolute left-0 top-full z-10 mt-1 w-max max-w-xs rounded-md bg-slate-900 px-2 py-1 text-xs text-white opacity-0 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {column.full}
      </span>
    </span>
  );
}
