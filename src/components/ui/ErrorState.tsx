import React from "react";

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
}: ErrorStateProps) {
  if (variant === "card") {
    return (
      <div
        role="alert"
        className={`flex flex-col items-center justify-center p-8 bg-red-50/50 border border-red-200 rounded-lg text-center ${className}`}
      >
        <div className="w-10 h-10 mb-3 rounded-full bg-red-100 flex items-center justify-center text-red-600">
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
        <h4 className="text-sm font-semibold text-red-900 mb-1">Gagal Memuat Data</h4>
        <p className="text-xs text-red-700 max-w-sm mb-4">{message}</p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-md text-xs font-medium transition-colors cursor-pointer"
          >
            Coba lagi
          </button>
        )}
      </div>
    );
  }

  return (
    <div
      role="alert"
      className={`rounded-lg bg-red-50 border border-red-200 p-4 flex items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-center gap-2 text-xs text-red-800">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="w-4 h-4 text-red-600 shrink-0"
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
        <button
          type="button"
          onClick={onRetry}
          className="text-xs text-red-700 hover:text-red-900 font-medium px-2.5 py-1 rounded bg-red-100 hover:bg-red-200 transition-colors cursor-pointer shrink-0"
        >
          Coba lagi
        </button>
      )}
    </div>
  );
}
