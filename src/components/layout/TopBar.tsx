"use client";

import { useAuth } from "@/hooks/useAuth";
import { LOGOUT_URL } from "@/lib/auth";
import { ROLE_LABEL } from "@/types";

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function TopBar() {
  const auth = useAuth();

  return (
    <header className="flex items-center justify-between bg-slate-900 px-6 py-3">
      <span className="flex items-center gap-2 text-sm font-semibold text-white">
        <span className="h-5 w-5 rounded bg-indigo-500" />
        IndoLegalBench
      </span>

      {auth.status === "authenticated" && (
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-indigo-600 text-xs font-semibold text-white">
            {initials(auth.user.name)}
          </span>
          <span className="text-right text-xs leading-tight">
            <span className="block font-medium text-white">
              {auth.user.name}
            </span>
            <span className="block text-slate-400">
              {ROLE_LABEL[auth.user.role]}
            </span>
          </span>
          <form method="POST" action={LOGOUT_URL}>
            <button
              type="submit"
              className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Keluar
            </button>
          </form>
        </div>
      )}
    </header>
  );
}