"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export const TOAST_DURATION_MS = 4000;

type ToastContextValue = { showToast: (message: string) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Satu toast pada satu waktu. Dipasang di layout (protected) agar toast
 * tetap tampil saat halaman berpindah lewat router.push.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearTimer();
    setMessage(null);
  }, [clearTimer]);

  const showToast = useCallback(
    (next: string) => {
      clearTimer();
      setMessage(next);
      timer.current = setTimeout(close, TOAST_DURATION_MS);
    },
    [clearTimer, close],
  );

  useEffect(() => clearTimer, [clearTimer]);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-label="Notifikasi"
        className="pointer-events-none fixed bottom-6 right-6 z-50"
      >
        {message !== null && (
          <div className="pointer-events-auto flex items-center gap-3 rounded-md bg-slate-900 px-4 py-3 text-sm text-white shadow-lg">
            <span>{message}</span>
            <button
              type="button"
              onClick={close}
              aria-label="Tutup notifikasi"
              className="text-slate-300 hover:text-white"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (context === null) {
    throw new Error("useToast harus dipakai di dalam ToastProvider");
  }
  return context;
}
