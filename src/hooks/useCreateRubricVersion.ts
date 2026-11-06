"use client";

import { useCallback, useRef, useState } from "react";

import type { RubricDraft } from "@/lib/rubrics/rubricDraft";
import { createErrorMessage, fieldErrorOf } from "@/lib/rubrics/rubricErrors";
import { toCreateRequest } from "@/lib/rubrics/rubricRequest";
import { httpRubricsGateway, type RubricsGateway } from "@/lib/rubrics/rubricsApi";
import type { RubricVersion } from "@/types/rubric";

/**
 * Kirim form versi baru rubrik (PBI-14 AC7, POST /rubrics). Kegagalan disimpan mentah dan pesannya
 * diturunkan dengan fungsi murni, supaya field yang ditolak server (422) sampai ke form.
 * Gateway disuntikkan, jadi hook diuji tanpa jaringan.
 */
export function useCreateRubricVersion(
  onCreated: (version: RubricVersion) => void,
  gateway: RubricsGateway = httpRubricsGateway,
) {
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<{ error: unknown } | null>(null);
  // Ref, bukan state: klik kedua bisa masuk sebelum render ulang menonaktifkan tombol.
  const inFlight = useRef(false);

  const submit = useCallback(
    async (draft: RubricDraft): Promise<void> => {
      if (inFlight.current) return;
      inFlight.current = true;
      setPending(true);
      setFailure(null);
      let created: RubricVersion | null = null;
      try {
        created = await gateway.createVersion(toCreateRequest(draft));
      } catch (error) {
        setFailure({ error });
      } finally {
        inFlight.current = false;
        setPending(false);
      }
      // Di luar try: galat di onCreated bukan kegagalan simpan. Kalau dilaporkan sebagai gagal,
      // Admin menekan lagi padahal versinya sudah terbentuk di server dan jadi dobel.
      if (created !== null) onCreated(created);
    },
    [gateway, onCreated],
  );

  return {
    submit,
    pending,
    error: failure === null ? null : createErrorMessage(failure.error),
    fieldError: failure === null ? null : fieldErrorOf(failure.error),
  };
}
