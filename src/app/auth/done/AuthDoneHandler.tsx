"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
  ME_URL,
  ROLE_HOME_PATH,
  isAuthErrorCode,
  parseRole,
  type AuthErrorCode,
} from "@/lib/auth";

// The three screens this page can show.
type ViewState =
  | { status: "loading" }
  | { status: "auth-error"; code: AuthErrorCode }
  | { status: "failed" };

type AuthDoneHandlerProps = {
  initialErrorCode?: AuthErrorCode;
};

const PAGE_CLASS =
  "flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950";

const CARD_CLASS =
  "w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900";

const TITLE_CLASS =
  "text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50";

const MESSAGE_CLASS = "mt-3 text-sm text-zinc-600 dark:text-zinc-400";

const PRIMARY_BUTTON_CLASS =
  "inline-flex w-full items-center justify-center rounded-lg bg-indigo-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-900 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-400";

const AUTH_ERROR_COPY: Record <
  AuthErrorCode,
  { title: string; message: string }
> = {
  USER_NOT_REGISTERED: {
    title: "Akun Anda belum terdaftar",
    message:
      "Akun Veritask Anda belum terdaftar di IndoLegalBench. Hubungi Admin untuk didaftarkan.",
  },
  USER_DEACTIVATED: {
    title: "Akun Anda telah dinonaktifkan",
    message:
      "Akun ini tidak dapat digunakan untuk masuk. Hubungi Admin jika Anda merasa ini keliru.",
  },
};

// Safely read a field from an unknown JSON body.
function readField(body: unknown, key: string): unknown {
  if (typeof body === "object" && body !== null && key in body) {
    return (body as Record<string, unknown>)[key];
  }
  return undefined;
}

export function AuthDoneHandler({ initialErrorCode }: AuthDoneHandlerProps) {
  const router = useRouter();
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ViewState>(
    initialErrorCode
      ? { status: "auth-error", code: initialErrorCode }
      : { status: "loading" },
  );

  // 1. Fetch the profile once on mount (and again on every retry).
  useEffect(() => {
    // The error is already known from the URL, so there is no profile to fetch.
    if (initialErrorCode) return;

    const controller = new AbortController();

    async function resolveProfile() {
      try {
        const response = await fetch(ME_URL, {
          credentials: "include", // send the session cookie across origins
          signal: controller.signal,
        });
        const body: unknown = await response.json().catch(() => null);

        // 2. Success: redirect to the home page of the user's role.
        if (response.ok) {
          const role = parseRole(readField(body, "role"));
          if (role) {
            router.replace(ROLE_HOME_PATH[role]);
          } else {
            setState({ status: "failed" });
          }
          return;
        }

        const code = readField(body, "code");

        // 3. Known account errors: show a dedicated screen.
        if (isAuthErrorCode(code)) {
          setState({ status: "auth-error", code });
          return;
        }

        // 4. Not signed in: go back to the login page.
        if (response.status === 401) {
          router.replace(
            code === "SESSION_EXPIRED" ? "/login?reason=expired" : "/login",
          );
          return;
        }

        // 5. Anything else: generic failure with a retry button.
        setState({ status: "failed" });
      } catch {
        if (controller.signal.aborted) return;
        setState({ status: "failed" });
      }
    }

    void resolveProfile();

    return () => controller.abort();
  }, [initialErrorCode, attempt, router]);

  function handleRetry() {
    setState({ status: "loading" });
    setAttempt((current) => current + 1);
  }

  if (state.status === "loading") {
    return (
      <main className={PAGE_CLASS}>
        <div
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-4"
        >
          <div
            aria-hidden="true"
            className="size-8 animate-spin rounded-full border-4 border-zinc-300 border-t-indigo-900 dark:border-zinc-700 dark:border-t-indigo-400"
          />
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Memproses login Anda...
          </p>
        </div>
      </main>
    );
  }

  if (state.status === "auth-error") {
    const copy = AUTH_ERROR_COPY[state.code];
    return (
      <main className={PAGE_CLASS}>
        <div role="alert" className={CARD_CLASS}>
          <h1 className={TITLE_CLASS}>{copy.title}</h1>
          <p className={MESSAGE_CLASS}>{copy.message}</p>
          <Link href="/login" className={`mt-8 ${PRIMARY_BUTTON_CLASS}`}>
            Kembali ke halaman masuk
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className={PAGE_CLASS}>
      <div role="alert" className={CARD_CLASS}>
        <h1 className={TITLE_CLASS}>Gagal memproses login</h1>
        <p className={MESSAGE_CLASS}>
          Terjadi kendala saat mengambil data akun Anda. Silakan coba lagi.
        </p>
        <button
          type="button"
          onClick={handleRetry}
          className={`mt-8 ${PRIMARY_BUTTON_CLASS}`}
        >
          Coba lagi
        </button>
        <Link
          href="/login"
          className="mt-4 block text-sm text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Kembali ke halaman masuk
        </Link>
      </div>
    </main>
  );
}