"use client";

import { LoadingState } from "@/components/ui/LoadingState";
import type { Suite } from "@/types/suite";

type Props = {
  status: "loading" | "ready" | "error";
  suites: Suite[];
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
  onRetry,
  onEdit,
  onDelete,
  onArchive,
}: Props) {
  if (status === "loading") return <LoadingState />;

  if (status === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <p className="text-sm text-slate-700">Gagal memuat daftar suite.</p>
        <button
          type="button"
          onClick={onRetry}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  if (suites.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-16 text-center">
        <p className="text-sm font-medium text-slate-700">Belum ada suite.</p>
        <p className="text-sm text-slate-500">
          Buat suite untuk mulai mengelompokkan kasus.
        </p>
      </div>
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
                <button
                  type="button"
                  onClick={() => onDelete(suite)}
                  aria-label={`Hapus ${suite.name}`}
                  className="text-sm text-red-700 hover:underline"
                >
                  Hapus
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}