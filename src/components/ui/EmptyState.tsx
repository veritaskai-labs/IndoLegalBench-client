import React from "react";
import { Button } from "./Button";

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    /** Tombol tampil tetapi mati, misalnya selama penilaian di latar belakang berjalan. */
    disabled?: boolean;
  };
  
  inTable?: boolean;
  colSpan?: number;
  className?: string;
}

export function EmptyState({
  title = "Tidak ada data ditemukan",
  description = "Belum ada item yang terdaftar atau sesuai kriteria pencarian.",
  action,
  inTable = false,
  colSpan = 5,
  className = "",
}: Readonly<EmptyStateProps>) {
  const content = (
    <div className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}>
      {/* Ikon folder / data kosong */}
      <div className="w-12 h-12 mb-3 rounded-full bg-surface flex items-center justify-center text-subtle">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className="w-6 h-6"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0l-3-3m3 3l3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      </div>

      <h3 className="text-sm font-semibold text-ink mb-1">{title}</h3>
      <p className="text-xs text-muted max-w-sm mb-4">{description}</p>

      {action && (
        <Button onClick={action.onClick} disabled={action.disabled}>
          {action.label}
        </Button>
      )}
    </div>
  );

  if (inTable) {
    return (
      <tr>
        <td colSpan={colSpan}>{content}</td>
      </tr>
    );
  }

  return content;
}
