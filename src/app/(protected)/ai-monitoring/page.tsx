"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/apiClient";

type MonitoringLink = { url: string | null; reachable: boolean };

export default function AiMonitoringPage() {
  const auth = useAuth();
  const router = useRouter();
  const [link, setLink] = useState<MonitoringLink | null>(null);

  const isAuthenticated = auth.status === "authenticated";
  const isAllowed =
    isAuthenticated &&
    (auth.user.role === "admin" || auth.user.role === "developer_ai");

  useEffect(() => {
    if (isAuthenticated && !isAllowed) {
      router.replace("/forbidden");
    }
  }, [isAuthenticated, isAllowed, router]);

  useEffect(() => {
    if (!isAllowed) {
      return;
    }
    let cancelled = false;
    apiFetch<MonitoringLink>("/ai-monitoring")
      .then((data) => {
        if (!cancelled) {
          setLink(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLink({ url: null, reachable: false });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isAllowed]);

  if (!isAuthenticated || (isAllowed && link === null)) {
    return <LoadingState />;
  }

  if (!isAllowed) {
    return null;
  }

  // The address bar stays on /ai-monitoring. The frame is this same site,
  // already signed in. `url` is not used for navigation.
  if (link.reachable) {
    return (
      <iframe
        title="Pemantauan AI"
        src="/ai-monitoring/view/"
        referrerPolicy="same-origin"
        className="fixed inset-0 z-50 h-dvh w-screen border-0 bg-white"
      />
    );
  }

  return <p className="text-sm text-slate-600">Antarmuka Langfuse lokal tidak terjangkau.</p>;
}
