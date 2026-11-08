"use client";

import type { JudgeOptionsApi } from "@/hooks/useJudgeOptions";

type Props = {
  /** Id penilai terpilih; string kosong berarti belum memilih. */
  value: string;
  onChange: (judgeId: string) => void;
  disabled?: boolean;
  api?: JudgeOptionsApi;
};

/** Pemilih penilai (LLM judge) dari daftar yang sudah terdaftar (PBI-14 AC1). */
export function JudgeProviderSelect(props: Readonly<Props>) {
  void props;
  return null;
}
