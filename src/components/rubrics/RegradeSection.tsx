"use client";

import { useState } from "react";

import { ErrorState } from "@/components/ui/ErrorState";
import { useToast } from "@/components/ui/Toast";
import type { AsyncResource } from "@/hooks/useAsyncResource";
import { useGradingRuns } from "@/hooks/useGradingRuns";
import { useRubricVersions } from "@/hooks/useRubricVersions";
import { httpGradingGateway, type GradingGateway } from "@/lib/grading/gradingApi";
import { REGRADE_UNAVAILABLE_TEXT, regradeAvailability, type RegradeUnavailableReason } from "@/lib/rubrics/regradeRules";
import { httpRubricsGateway, type RubricsGateway } from "@/lib/rubrics/rubricsApi";
import type { Role } from "@/types";
import type { SessionGradingResponse } from "@/types/grading";
import type { SessionDetail } from "@/types/measurement";
import { GradingHistoryList } from "./GradingHistoryList";
import { RegradeDialog } from "./RegradeDialog";

type RegradeSession = Pick<SessionDetail, "id" | "status" | "archived_at">;

type Props = Readonly<{
  session: RegradeSession;
  role: Role | null;
  /** Hasil terbaru sesi ini; null bila sesi belum pernah dinilai. */
  latest: SessionGradingResponse | null;
  gradingGateway?: GradingGateway;
  rubricsGateway?: RubricsGateway;
  /** Hasil di halaman perlu dimuat ulang: setelah nilai ulang, atau setelah dialog ditutup karena error. */
  onChanged: () => void;
}>;

/**
 * Nilai ulang dengan versi terbaru di halaman detail sesi (PBI-14 AC7). Hanya Admin: data
 * dimuat di komponen dalam, supaya peran lain tidak memanggil GET /admin/rubrics yang menjawab 403
 * dan mengalihkan mereka ke /forbidden. Kapan tombol boleh aktif ditentukan regradeAvailability.
 */
export function RegradeSection(props: Props) {
  if (props.role !== "admin") return null;
  return <AdminRegrade {...props} />;
}

/** Pesan dari sumber data pertama yang gagal dimuat, atau null kalau semuanya baik-baik saja. */
function firstError(...resources: AsyncResource<unknown>[]): string | null {
  for (const resource of resources) {
    if (resource.status === "error") return resource.message;
  }
  return null;
}

function AdminRegrade({
  session,
  role,
  latest,
  gradingGateway = httpGradingGateway,
  rubricsGateway = httpRubricsGateway,
  onChanged,
}: Props) {
  const { showToast } = useToast();
  const versions = useRubricVersions(rubricsGateway);
  const runs = useGradingRuns(session.id, gradingGateway);
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

  const availability = regradeAvailability({ role, session, versions: versions.data, latest });
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
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-slate-900">Riwayat penilaian</h3>
        <GradingHistoryList runs={runs.data} />
      </div>
      {open && availability.available && (
        <RegradeDialog
          session={session}
          version={availability.version}
          gateway={gradingGateway}
          onRegraded={() => {
            setOpen(false);
            runs.reload();
            onChanged();
            showToast(`Penilaian ulang selesai dengan Versi ${availability.version.version_no}.`);
          }}
          onClose={(afterError) => {
            setOpen(false);
            // Setelah penolakan, hasil yang tampil mungkin sudah tidak sama dengan server.
            if (afterError) {
              runs.reload();
              onChanged();
            }
          }}
        />
      )}
    </section>
  );
}
