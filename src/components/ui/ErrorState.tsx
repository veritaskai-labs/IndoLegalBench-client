import React from "react";
import { Button } from "./Button";

interface ErrorStateProps {
  message?: string;
  /** Callback untuk memicu pengambilan ulang data */
  onRetry?: () => void;
  /** 'banner' untuk alert ringkas di atas tabel, 'card' untuk pesan error penuh di tengah halaman */
  variant?: "banner" | "card";
  className?: string;
}

export function ErrorState({
  message = "Terjadi kesalahan saat memuat data.",
  onRetry,
  variant = "banner",
  className = "",
}: Readonly<ErrorStateProps>) {
  if (variant === "card") {
    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center p-8 bg-paper border border-line rounded-control text-center ${className}`}
      >
        <div className="w-10 h-10 mb-3 rounded-full bg-surface flex items-center justify-center text-danger">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className="w-5 h-5"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h4 className="text-sm font-semibold text-ink mb-1">Gagal Memuat Data</h4>
        <p className="text-xs text-ink-soft max-w-sm mb-4">{message}</p>
        {onRetry && (
          <Button size="sm" onClick={onRetry}>
            Coba lagi
          </Button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={`rounded-control bg-paper border border-line p-4 flex items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-2 text-xs text-ink">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 text-danger shrink-0"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
            clipRule="evenodd"
          />
        </svg>
        <span>{message}</span>
      </div>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry} className="shrink-0">
          Coba lagi
        </Button>
      )}
    </div>
  );
}
