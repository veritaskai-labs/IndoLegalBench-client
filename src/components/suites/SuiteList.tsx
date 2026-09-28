"use client";

import Link from "next/link";
import { EmptyState, ErrorState, LoadingSkeleton } from "@/components/ui";import type { Suite } from "@/types/suite";


type Props = {
  status: "loading" | "ready" | "error";
  suites: Suite[];
  /** Hanya author dan admin yang boleh membuat kasus. */
  canCreateCase?: boolean;
  onRetry: () => void;
  onEdit: (suite: Suite) => void;
  onDelete: (suite: Suite) => void;
  onArchive: (suite: Suite) => void;
};

const STATUS_LABEL: Record<string, string> = {
  active: "Aktif",
  archived: "Arsip",
};

export function SuiteList({
  status,
  suites,
  canCreateCase = false,
  onRetry,
  onEdit,
  onDelete,
  onArchive,
}: Props) {
  
  if (status === "loading") {
    return (
      <table className="w-full text-left text-sm">
        <tbody>
          <LoadingSkeleton variant="table" rows={3} columns={5} />
        </tbody>
      </table>
    );
  }

  if (status === "error") {
    return (
      <ErrorState
        variant="card"
        message="Gagal memuat daftar suite."
        onRetry={onRetry}
      />
    );
  }

  if (suites.length === 0) {
    return (
      <EmptyState
        title="Belum ada suite"
        description="Buat suite untuk mulai mengelompokkan kasus."
      />
    );
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-slate-200 text-xs uppercase text-slate-500">
        <tr>
          <th scope="col" className="px-4 py-3 font-medium">Nama</th>
          <th scope="col" className="px-4 py-3 font-medium">Deskripsi</th>
          <th scope="col" className="px-4 py-3 font-medium">Jumlah kasus</th>
          <th scope="col" className="px-4 py-3 font-medium">Status</th>
          <th scope="col" className="px-4 py-3 font-medium">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {suites.map((suite) => (
          <tr key={suite.id} className="border-b border-slate-100">
            <td className="px-4 py-3">
              <span className="font-medium text-slate-900">{suite.name}</span>
              {suite.is_empty && (
                <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                  Kosong
                </span>
              )}
            </td>
            <td className="px-4 py-3 text-slate-600">
              {suite.description ?? "—"}
            </td>
            <td className="px-4 py-3 text-slate-600">{suite.case_count}</td>
            <td className="px-4 py-3 text-slate-600">
              {STATUS_LABEL[suite.status] ?? suite.status}
            </td>
            <td className="px-4 py-3">
              <div className="flex gap-3">
                {canCreateCase && suite.status === "active" && (
                  <Link
                    href={`/suites/${encodeURIComponent(suite.id)}/cases/new`}
                    aria-label={`Buat kasus di ${suite.name}`}
                    className="text-sm font-medium text-slate-900 hover:underline"
                  >
                    Buat kasus
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => onEdit(suite)}
                  aria-label={`Ubah ${suite.name}`}
                  className="text-sm text-slate-700 hover:underline"
                >
                  Ubah
                </button>
                <button
                  type="button"
                  onClick={() => onArchive(suite)}
                  aria-label={
                    suite.status === "archived"
                      ? `Aktifkan ${suite.name}`
                      : `Arsipkan ${suite.name}`
                  }
                  className="text-sm text-slate-700 hover:underline"
                >
                  {suite.status === "archived" ? "Aktifkan" : "Arsipkan"}
                </button>
                {suite.status !== "archived" && (
                  <button
                  type="button"
                  onClick={() => onDelete(suite)}
                  aria-label={`Hapus ${suite.name}`}
                  className="text-sm text-red-700 hover:underline">
                    Hapus
                    </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}