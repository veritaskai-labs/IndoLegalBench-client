"use client";

import Link from "next/link";
import { Fragment } from "react";

export type BreadcrumbItem = {
  /** Teks yang tampil. null saat nama masih dimuat. */
  label: string | null;
  /** Navigasi langsung. Jangan dipakai di halaman yang punya form belum tersimpan. */
  href?: string;
  /** Navigasi lewat handler, supaya halaman bisa mengonfirmasi dulu. */
  onClick?: () => void;
};

type Props = {
  items: BreadcrumbItem[];
};

/**
 * Jejak navigasi antar halaman, misal: Suite › Hukum Ketenagakerjaan › KTK-001.
 *
 * Item terakhir selalu teks biasa, karena itu halaman yang sedang dibuka.
 * Item lain bisa berupa href (navigasi Next.js) atau onClick (halaman yang
 * perlu mengonfirmasi perubahan belum tersimpan sebelum pindah).
 */
export function Breadcrumb({ items }: Props) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const text = item.label ?? "…";

          return (
            <Fragment key={`${item.label ?? "loading"}-${index}`}>
              {index > 0 && (
                <li aria-hidden="true" className="text-slate-400">
                  ›
                </li>
              )}
              <li className="max-w-xs truncate">
                {isLast ? (
                  <span aria-current="page" className="text-slate-700">
                    {text}
                  </span>
                ) : item.href ? (
                  <Link href={item.href} className="hover:text-slate-800 transition-colors">
                    {text}
                  </Link>
                ) : item.onClick ? (
                  <button
                    type="button"
                    onClick={item.onClick}
                    className="hover:text-slate-800 transition-colors cursor-pointer"
                  >
                    {text}
                  </button>
                ) : (
                  <span>{text}</span>
                )}
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}