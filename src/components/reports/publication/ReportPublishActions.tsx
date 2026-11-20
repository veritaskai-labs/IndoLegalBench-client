"use client";

import Link from "next/link";
import { useId, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { httpPublicationGateway, type PublicationGateway } from "@/lib/reports/publicationApi";
import { DEV_SCORES_MESSAGE, canPublish, publishState, versionLabel } from "@/lib/reports/publicationRules";
import type { ReportSummary } from "@/types/reports";

import { PublishReportDialog } from "./PublishReportDialog";

const PRIMARY =
  "rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";
const LINK = "text-sm font-medium text-indigo-700 hover:underline";

type Report = Pick<ReportSummary, "id" | "title" | "status" | "has_dev_scores" | "score_scope">;

/**
 * Bagian penerbitan di halaman satu laporan (PBI-17 SCRUM-335). Tombol Terbitkan hanya untuk Admin (AC9);
 * laporan dengan skor dev tidak bisa diterbitkan dan alasannya tampil sebelum diklik (AC12). Versi yang sudah
 * digantikan tetap bisa dibuka semua peran dan ditandai jelas. onChanged meminta halaman memuat ulang laporan.
 */
export function ReportPublishActions({
  report,
  gateway = httpPublicationGateway,
  onChanged,
}: Readonly<{ report: Report; gateway?: PublicationGateway; onChanged: () => void }>) {
  const auth = useAuth();
  const reasonId = useId();
  const [open, setOpen] = useState(false);
  const [published, setPublished] = useState<number | null>(null);

  if (auth.status !== "authenticated") return null;
  const admin = canPublish(auth.user.role);
  const state = publishState(report);

  if (state === "superseded") {
    return (
      <div role="note" className="w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Laporan ini sudah digantikan versi yang lebih baru. Versi ini tetap tersimpan.{" "}
        <Link href="/reports/published" className={LINK}>
          Lihat daftar laporan terbit
        </Link>
      </div>
    );
  }

  if (state === "already_published") {
    return (
      <div className="space-y-1 text-sm">
        {published !== null && <p role="status" className="text-green-800">Laporan diterbitkan sebagai {versionLabel(published)}.</p>}
        <Link href="/reports/published" className={LINK}>
          Lihat daftar laporan terbit
        </Link>
        {admin && (
          <p className="text-slate-600">
            Untuk mengganti versi ini, buat laporan baru lalu saat menerbitkannya pilih Ganti versi yang sedang terbit.
          </p>
        )}
      </div>
    );
  }

  if (!admin) return null;

  return (
    <div className="space-y-1">
      <button
        type="button"
        className={PRIMARY}
        disabled={state === "dev_scores"}
        aria-describedby={state === "dev_scores" ? reasonId : undefined}
        onClick={() => setOpen(true)}
      >
        Terbitkan
      </button>
      {state === "dev_scores" && (
        <p id={reasonId} className="text-sm text-slate-600">
          {DEV_SCORES_MESSAGE}
        </p>
      )}
      {published !== null && <p role="status" className="text-sm text-green-800">Laporan diterbitkan sebagai {versionLabel(published)}.</p>}
      {open && (
        <PublishReportDialog
          report={report}
          gateway={gateway}
          onPublished={(publication) => {
            setOpen(false);
            setPublished(publication.version_no);
            onChanged();
          }}
          onClose={(afterError) => {
            setOpen(false);
            if (afterError) onChanged();
          }}
        />
      )}
    </div>
  );
}
