import type { Metadata } from "next";
import { LOGIN_URL } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Masuk | IndoLegalBench",
};

// TODO(SCRUM-94): The Zitadel self-service URL (forgot password / MFA issues)
// has not been decided by SA/BE yet. Fill it in once it is final, and do not
// add a new env var for it.
const ZITADEL_SELF_SERVICE_URL = "#";

type LoginPageProps = {
  searchParams: Promise<{ reason?: string | string[] }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { reason } = await searchParams;
  const reasonValue = Array.isArray(reason) ? reason[0] : reason;
  const isExpired = reasonValue === "expired";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <header className="text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            IndoLegalBench
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Platform internal Veritask untuk menulis, mereview, dan mengukur
            kasus uji hukum Indonesia.
          </p>
        </header>

        {isExpired && (
          <div
            role="status"
            aria-live="polite"
            className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200"
          >
            Sesi Anda telah berakhir, silakan masuk kembali
          </div>
        )}

        <div className="mt-8 flex flex-col gap-4">
          {/* Plain <a>: full-page navigation into the OIDC flow, not client-side routing */}
          <a
            href={LOGIN_URL}
            className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-900 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-400"
          >
            Masuk dengan akun Veritask
          </a>

          <a
            href={ZITADEL_SELF_SERVICE_URL}
            className="text-center text-sm text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:focus-visible:outline-indigo-400"
          >
            Lupa kata sandi atau masalah MFA
          </a>
        </div>
      </div>
    </main>
  );
}
