"use client";

import { useId } from "react";
import Link from "next/link";
import { ErrorState } from "@/components/ui/ErrorState";
import { useAuth } from "@/hooks/useAuth";
import { useJudgeOptions, type JudgeOptionsApi } from "@/hooks/useJudgeOptions";

type Props = {
  /** Id penilai terpilih; string kosong berarti belum memilih. */
  value: string;
  onChange: (judgeId: string) => void;
  disabled?: boolean;
  api?: JudgeOptionsApi;
};

const BOX =
  "mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900";

/** Pemilih penilai (LLM judge) dari provider otomatis yang aktif di halaman Provider (PBI-14 AC1). */
export function JudgeProviderSelect({
  value,
  onChange,
  disabled = false,
  api,
}: Readonly<Props>) {
  const id = useId();
  const judges = useJudgeOptions(api);
  const auth = useAuth();
  const isAdmin = auth.status === "authenticated" && auth.user.role === "admin";

  function control() {
    if (judges.status === "error") {
      return (
        <ErrorState
          message="Gagal memuat provider penilai."
          onRetry={judges.reload}
          className="mt-1"
        />
      );
    }
    if (judges.status !== "ready") {
      return (
        <output className={`${BOX} flex items-center gap-2 text-slate-500`}>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
          <span>Memuat provider penilai…</span>
        </output>
      );
    }
    if (judges.options.length === 0) {
      return (
        <p className="mt-1 text-sm text-slate-500">
          Belum ada provider yang aktif.{" "}
          {isAdmin ? (
            <>
              Tambahkan di{" "}
              <Link
                href="/admin/providers"
                className="text-indigo-600 underline"
              >
                halaman Provider
              </Link>
              .
            </>
          ) : (
            "Minta Admin menambahkannya di halaman Provider."
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
        className={BOX}
      >
        <option value="">Pilih provider penilai</option>
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
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        Provider Penilai (LLM Judge) <span className="text-red-500">*</span>
      </label>
      {control()}
    </div>
  );
}
