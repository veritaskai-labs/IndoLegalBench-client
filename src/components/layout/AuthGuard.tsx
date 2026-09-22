"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { LoadingState } from "@/components/ui/LoadingState";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (auth.status !== "unauthenticated") return;
    const query = auth.reason === "expired" ? "?reason=expired" : "";
    router.replace(`/login${query}`);
  }, [auth, router]);

  if (auth.status !== "authenticated") return <LoadingState />;
  return <>{children}</>;
}