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
    <main className="flex min-h-screen flex-col lg:flex-row">
      {/* Brand panel. Design ref: RevisiDesign-Group-4.pdf, Gambar 5.1 Login Page. */}
      {/* TODO(SCRUM-94): the mockup's stats footer (kasus disetujui / penyedia diukur / repetisi) is skipped until a real data source for it is confirmed. */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center bg-zinc-950 px-16 py-16 text-white">
        <div className="flex items-center gap-2">
          <span className="size-6 rounded bg-indigo-500" aria-hidden="true" />
          <span className="text-sm font-semibold">IndoLegalBench</span>
        </div>
        <p className="mt-12 text-xs font-medium uppercase tracking-widest text-zinc-400">
          Tolok ukur netral untuk AI hukum Indonesia
        </p>
        {/* Decorative marketing copy from the mockup, not the page's primary heading (see <h1> below). */}
        <p className="mt-4 max-w-lg text-3xl font-semibold leading-tight">
          Klaim kualitas menjadi angka yang bisa diperiksa siapa pun.
        </p>
        <p className="mt-4 max-w-md text-sm text-zinc-400">
          Kasus ditulis oleh advokat, ditinjau dua kali secara buta, dan dijalankan tiga kali per penyedia. Setiap angka bisa dilacak ke versi kasus dan respons mentahnya.
        </p>
      </div>

      {/* Login form */}
      <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
        <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <header>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
              Masuk
            </h1>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              Akses diberikan melalui single sign-on Veritask. Peran Anda menentukan apa yang bisa Anda lakukan di setiap layar.
            </p>
          </header>

          {isExpired && (
            <div role="status" aria-live="polite" className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-200">
              Sesi Anda telah berakhir, silakan masuk kembali
            </div>
          )}

          <div className="mt-8 flex flex-col gap-4">
            {/* Plain <a>: full-page navigation into the OIDC flow, not client-side routing */}
            <a href={LOGIN_URL} className="inline-flex w-full items-center justify-center rounded-lg bg-indigo-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-900 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-400">
              Masuk dengan akun Veritask
            </a>

            <a href={ZITADEL_SELF_SERVICE_URL} className="text-center text-sm text-zinc-600 underline-offset-4 hover:text-zinc-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-900 dark:text-zinc-400 dark:hover:text-zinc-100 dark:focus-visible:outline-indigo-400">
              Lupa kata sandi atau masalah MFA
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}