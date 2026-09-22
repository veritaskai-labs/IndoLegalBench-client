"use client";

import { useAuth } from "@/hooks/useAuth";

/** Placeholder */
export default function DashboardPage() {
  const auth = useAuth();
  const firstName =
    auth.status === "authenticated" ? auth.user.name.split(" ")[0] : "";

  return (
    <h1 className="text-3xl font-semibold text-slate-900">
      Selamat pagi, {firstName}
    </h1>
  );
  
}