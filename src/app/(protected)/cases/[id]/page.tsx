"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { CaseEditorForm } from "@/components/cases/CaseEditorForm";
import { CaseStatusBadge } from "@/components/cases/CaseStatusBadge";
import { SplitTagBadge } from "@/components/cases/SplitTagBadge";
import { Breadcrumb } from "@/components/ui";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAuth } from "@/hooks/useAuth";
import { useCaseDetail } from "@/hooks/useCaseDetail";
import { useSuiteName } from "@/hooks/useSuiteName";
import { fromCaseRead } from "@/lib/cases/caseFormMapping";
import { caseEditPath } from "@/lib/cases/casePaths";
import { decodeRouteParam } from "@/lib/routeParams";

/**
 * Halaman baca kasus untuk Developer AI (SCRUM-184). Server hanya memberi versi approved
 * dari kasus dev; editor tidak dipakai karena riwayat, kelengkapan, dan draf dijawab 403.
 * Peran lain tetap memakai editor.
 */
export default function CaseReadPage() {
  const caseId = decodeRouteParam(useParams<{ id: string }>().id);
  const auth = useAuth();
  const router = useRouter();
  const isDeveloperAi =
    auth.status === "authenticated" && auth.user.role === "developer_ai";

  useEffect(() => {
    if (auth.status === "authenticated" && !isDeveloperAi) {
      router.replace(caseEditPath(caseId));
    }
  }, [auth.status, isDeveloperAi, caseId, router]);

  if (!isDeveloperAi) return <LoadingState label="Memuat kasus…" />;
  return <CaseReadView caseId={caseId} />;
}

/** Pesan tetap untuk kasus yang memang tidak bisa dibuka; null berarti boleh dicoba lagi. */
function errorMessage(error: Readonly<{ hidden: boolean; notFound: boolean }>): string | null {
  if (error.hidden) return "Kasus ini termasuk test set, jadi isinya tidak dapat dibuka.";
  if (error.notFound) return "Kasus tidak ditemukan.";
  return null;
}

function CaseReadView({ caseId }: Readonly<{ caseId: string }>) {
  const detail = useCaseDetail(caseId);
  const suiteName = useSuiteName(
    detail.status === "ready" ? detail.saved.suite_id : null,
  );

  if (detail.status === "loading") return <LoadingState label="Memuat kasus…" />;

  if (detail.status === "error") {
    const message = errorMessage(detail);
    return message !== null ? (
      <div className="space-y-4">
        <ErrorState variant="card" message={message} />
        <Link
          href="/suites"
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Kembali ke Suites
        </Link>
      </div>
    ) : (
      <ErrorState variant="card" message="Gagal memuat kasus." onRetry={detail.reload} />
    );
  }

  const { saved } = detail;
  const suitePath = `/suites/${encodeURIComponent(saved.suite_id)}`;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Breadcrumb
        items={[
          { label: "Suite", href: "/suites" },
          { label: suiteName, href: suitePath },
          { label: saved.case_code },
        ]}
      />

      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-slate-900">{saved.case_code}</h1>
        <CaseStatusBadge status={saved.status} />
        <SplitTagBadge tag={saved.split_tag} wasDev={saved.was_dev} />
      </header>

      <Link
        href={suitePath}
        className="inline-block text-xs font-medium text-indigo-600 hover:text-indigo-800"
      >
        Kembali ke suite
      </Link>

      <CaseEditorForm
        defaultValues={fromCaseRead(saved)}
        caseId={caseId}
        onSubmit={() => {}}
        readOnly
        tagLocked
      />
    </div>
  );
}
