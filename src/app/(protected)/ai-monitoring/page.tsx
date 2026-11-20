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

  // Langfuse mengirim frame-ancestors 'none', jadi antarmukanya tidak bisa
  // disisipkan. Membuka URL lokal menampilkan UI yang sama, tanpa menggambar ulang.
  useEffect(() => {
    if (link?.url && link.reachable) {
      window.location.replace(link.url);
    }
  }, [link]);

  if (!isAuthenticated || (isAllowed && link === null)) {
    return <LoadingState />;
  }

  if (!isAllowed) {
    return null;
  }

  if (link?.url && link.reachable) {
    return <LoadingState />;
  }

  return <p className="text-sm text-slate-600">Antarmuka Langfuse lokal tidak terjangkau.</p>;
}
