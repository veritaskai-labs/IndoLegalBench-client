"use client";

import { useEffect, useId } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import { useJudgeOptions, type JudgeOptionsApi } from "@/hooks/useJudgeOptions";
import { isUnavailableJudge } from "@/lib/providers/judgeChoice";

type Props = {
  /** Id penilai terpilih; string kosong berarti belum memilih. */
  value: string;
  onChange: (judgeId: string) => void;
  disabled?: boolean;
  api?: JudgeOptionsApi;
};

const BOX = "h-9 w-full rounded-control border border-line bg-paper px-3 text-sm text-ink";

const COST_NOTE = "Biayanya memotong anggaran bulanan produk ini di halaman Produk AI.";

/**
 * Pemilih penilai LLM (LLM judge) dari produk otomatis yang aktif di halaman Produk AI (PBI-14 AC1).
 * SCRUM-375 C2: satu istilah, "Penilai LLM (LLM judge)", dan nama halaman sama dengan sidebar; catatan
 * biaya dibaca bersama pilihannya lewat aria-describedby.
 */
export function JudgeProviderSelect({
  value,
  onChange,
  disabled = false,
  api,
}: Readonly<Props>) {
  const id = useId();
  const noteId = `${id}-catatan`;
  const judges = useJudgeOptions(api);
  const auth = useAuth();
  const isAdmin = auth.status === "authenticated" && auth.user.role === "admin";
  // Pilihan yang sudah tidak aktif dikosongkan begitu daftarnya diketahui, supaya tampilan
  // "Pilih penilai LLM" dan nilai yang dikirim tidak berbeda (review client#92).
  const unavailable = judges.status === "ready" && isUnavailableJudge(value, judges.options);
  useEffect(() => {
    if (unavailable) onChange("");
  }, [unavailable, onChange]);

  function control() {
    if (judges.status === "error") {
      return <ErrorState message="Gagal memuat penilai LLM." onRetry={judges.reload} className="mt-1" />;
    }
    if (judges.status !== "ready") {
      return (
        <output className={`${BOX} mt-1 flex items-center gap-2 text-muted`}>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-accent" />
          <span>Memuat penilai LLM…</span>
        </output>
      );
    }
    if (judges.options.length === 0) {
      return (
        <p className="mt-1 text-sm text-muted">
          Belum ada penilai LLM yang aktif.{" "}
          {isAdmin ? (
            <>
              Tambahkan di{" "}
              <Link href="/admin/providers" className="text-accent-ink underline">
                halaman Produk AI
              </Link>
              .
            </>
          ) : (
            "Minta Admin menambahkannya di halaman Produk AI."
          )}
        </p>
      );
    }
    return (
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required
        aria-required="true"
        aria-describedby={noteId}
        className={`${BOX} mt-1`}
      >
        <option value="">Pilih penilai LLM</option>
        {judges.options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div>
      <div className="flex items-baseline">
        <label htmlFor={id} className="block text-sm font-medium text-ink">
          Penilai LLM (LLM judge)
        </label>
        <span aria-hidden="true" className="ml-0.5 text-accent">
          *
        </span>
      </div>
      <p id={noteId} className="text-xs leading-4 text-muted">
        {COST_NOTE}
      </p>
      {control()}
    </div>
  );
}
