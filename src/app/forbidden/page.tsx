import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Tidak Punya Akses | IndoLegalBench",
};

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 dark:bg-zinc-950">
      <div role="alert" className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h1 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Anda tidak punya akses</h1>
        <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">Peran akun Anda tidak berwenang membuka halaman atau melakukan aksi ini. Hubungi Admin jika Anda merasa ini keliru.</p>
        {/* /auth/done re-reads /me and redirects to the home page of the user's role */}
        <Link href="/auth/done" className="mt-8 inline-flex w-full items-center justify-center rounded-lg bg-indigo-900 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-900 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:outline-indigo-400">Kembali ke halaman kerja</Link>
      </div>
    </main>
  );
}