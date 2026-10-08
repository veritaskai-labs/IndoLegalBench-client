"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { onForbidden } from "@/lib/apiClient";
import { LoadingState } from "@/components/ui/LoadingState";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status !== "unauthenticated") return;
    const query = auth.reason === "expired" ? "?reason=expired" : "";
    router.replace(`/login${query}`);
  }, [auth, router]);

  // A 403 from any API call on a protected page sends the user to /forbidden.
  // apiFetch only reports it, the redirect lives here, next to the other auth redirects.
  // Only once the session is known, so a 403 while /me loads cannot race the /login redirect.
  const authenticated = auth.status === "authenticated";
  useEffect(() => {
    if (!authenticated) return;
    return onForbidden(() => router.replace("/forbidden"));
  }, [authenticated, router]);

  if (auth.status !== "authenticated") return <LoadingState />;
  return <>{children}</>;
}