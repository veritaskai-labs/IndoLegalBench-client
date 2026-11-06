"use client";

import { useState } from "react";

import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import type { AsyncResource } from "@/hooks/useAsyncResource";
import { useGradingRuns } from "@/hooks/useGradingRuns";
import { useRubricVersions } from "@/hooks/useRubricVersions";
import { REGRADE_UNAVAILABLE_TEXT, regradeAvailability, type RegradeUnavailableReason } from "@/lib/rubrics/regradeRules";
import { httpRubricsGateway, type RubricsGateway } from "@/lib/rubrics/rubricsApi";
import type { Role } from "@/types";
import { RegradeDialog } from "./RegradeDialog";

/**
 * Nilai ulang dengan versi terbaru di halaman detail sesi (PBI-14 AC7). Hanya Admin: data
 * dimuat di komponen dalam, supaya peran lain tidak memanggil GET /rubrics yang menjawab 403 dan
 * mengalihkan mereka ke /forbidden. Kapan tombol boleh aktif ditentukan regradeAvailability.
 */
export function RegradeSection({
  sessionId,
  role,
  gateway = httpRubricsGateway,
}: Readonly<{ sessionId: string; role: Role | null; gateway?: RubricsGateway }>) {
  if (role !== "admin") return null;
  return <AdminRegrade sessionId={sessionId} gateway={gateway} />;
}

/** Pesan dari sumber data pertama yang gagal dimuat, atau null kalau semuanya baik-baik saja. */
function firstError(...resources: AsyncResource<unknown>[]): string | null {
  for (const resource of resources) {
    if (resource.status === "error") return resource.message;
  }
  return null;
}

function AdminRegrade({ sessionId, gateway }: Readonly<{ sessionId: string; gateway: RubricsGateway }>) {
  const { showToast } = useToast();
  const versions = useRubricVersions(gateway);
  const runs = useGradingRuns(sessionId, gateway);
  const [open, setOpen] = useState(false);

  const failureMessage = firstError(versions, runs);
  if (failureMessage !== null) {
    return (
      <ErrorState
        message={failureMessage}
        onRetry={() => {
          versions.reload();
          runs.reload();
        }}
      />
    );
  }
  // Tidak menampilkan apa pun saat memuat, supaya tombol tidak berkedip hidup lalu mati.
  if (versions.status !== "ready" || runs.status !== "ready") return null;

  const availability = regradeAvailability({ role: "admin", versions: versions.data, runs: runs.data });
  // not_admin tidak mungkin di sini: komponen luar sudah menyaring peran.
  const reason = availability.available ? null : (availability.reason as Exclude<RegradeUnavailableReason, "not_admin">);

  return (
    <section aria-label="Nilai ulang" className="space-y-2">
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!availability.available}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
      >
        Nilai ulang dengan versi terbaru
      </button>
      {reason !== null && <p className="text-sm text-slate-500">{REGRADE_UNAVAILABLE_TEXT[reason]}</p>}
      {open && availability.available && (
        <RegradeDialog
          sessionId={sessionId}
          version={availability.version}
          runs={runs.data}
          gateway={gateway}
          onRegraded={(run) => {
            setOpen(false);
            runs.reload();
            showToast(`Penilaian ulang dimulai dengan Versi ${run.rubric_version_no}.`);
          }}
          onClose={(afterError) => {
            setOpen(false);
            // Setelah penolakan, riwayat yang tampil mungkin sudah tidak sama dengan server.
            if (afterError) runs.reload();
          }}
        />
      )}
    </section>
  );
}
