"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { onForbidden, onUnauthorized, type UnauthorizedReason } from "@/lib/apiClient";
import { LoadingState } from "@/components/ui/LoadingState";
import { SessionExpiry } from "@/components/layout/SessionExpiry";

function loginPath(reason: UnauthorizedReason): string {
  return reason === "expired" ? "/login?reason=expired" : "/login";
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();
  // Set by the first 401 after the session was known (SCRUM-252). Later 401s keep the first reason.
  const [ended, setEnded] = useState<UnauthorizedReason | null>(null);

  useEffect(() => {
    if (auth.status !== "unauthenticated") return;
    router.replace(loginPath(auth.reason));
  }, [auth, router]);

  // A 403 from any API call on a protected page sends the user to /forbidden.
  // apiFetch only reports it, the redirect lives here, next to the other auth redirects.
  // Only once the session is known, so a 403 while /me loads cannot race the /login redirect.
  const authenticated = auth.status === "authenticated";
  useEffect(() => {
    if (!authenticated) return;
    return onForbidden(() => router.replace("/forbidden"));
  }, [authenticated, router]);

  // A 401 from any later call means the session is gone (idle, absolute cap, logged out elsewhere).
  // Same rule as 403: only once the session is known; while /me loads, the provider decides.
  useEffect(() => {
    if (!authenticated) return;
    return onUnauthorized((reason) => setEnded((first) => first ?? reason));
  }, [authenticated]);

  useEffect(() => {
    if (ended !== null) router.replace(loginPath(ended));
  }, [ended, router]);

  // Unmounting the children drops whatever the page fetched, so nothing stays on screen.
  if (auth.status !== "authenticated" || ended !== null) return <LoadingState />;
  return (
    <>
      <SessionExpiry />
      {children}
    </>
  );
}
