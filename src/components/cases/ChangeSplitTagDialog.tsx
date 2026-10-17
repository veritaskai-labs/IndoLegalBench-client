"use client";

import { useId, useState } from "react";
import { isDevToTest, SPLIT_TAG_LABEL, splitTagErrorMessage } from "@/lib/cases/splitTag";
import { changeSplitTag } from "@/lib/cases/splitTagApi";
import type { CaseRead, SplitTag } from "@/types/case";

type Props = {
  caseId: string;
  caseCode: string;
  current: SplitTag;
  onClose: () => void;
  onDone: (saved: CaseRead) => void;
};

const TAGS: readonly SplitTag[] = ["dev", "test"];

/**
 * Admin mengubah tag kasus yang sudah disetujui (PBI-9 AC3, SCRUM-165).
 * Dev ke test diberi peringatan lebih dulu dan baru terkirim setelah Admin mencentang
 * konfirmasi, jadi server tidak perlu menjawab 409 TAG_CHANGE_NEEDS_CONFIRMATION.
 */
export function ChangeSplitTagDialog({ caseId, caseCode, current, onClose, onDone }: Props) {
  const baseId = useId();
  const [chosen, setChosen] = useState<SplitTag>(current);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const title = `Ubah tag ${caseCode}`;
  const needsWarning = isDevToTest(current, chosen);
  const canSave = chosen !== current && (!needsWarning || confirmed) && !busy;

  function choose(tag: SplitTag) {
    setChosen(tag);
    // Konfirmasi berlaku untuk satu pilihan; pindah pilihan berarti harus dibaca ulang.
    setConfirmed(false);
    setError(null);
  }

  async function handleSave() {
    setError(null);
    setBusy(true);
    try {
      onDone(await changeSplitTag(caseId, chosen, needsWarning && confirmed));
    } catch (failure) {
      setError(splitTagErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">
          Kasus ini sudah disetujui, jadi tagnya hanya bisa diubah Admin. Perubahan tercatat di log audit.
        </p>

        <fieldset className="mt-4 space-y-2">
          <legend className="text-xs font-semibold text-slate-700">Tag baru</legend>
          {TAGS.map((tag) => (
            <label key={tag} className="flex items-center gap-2 text-sm text-slate-800">
              <input
                type="radio"
                name={`${baseId}-tag`}
                value={tag}
                checked={chosen === tag}
                onChange={() => choose(tag)}
              />
              {SPLIT_TAG_LABEL[tag]}
            </label>
          ))}
        </fieldset>

        {needsWarning && (
          <div className="mt-4 space-y-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
            <p role="alert" className="text-xs text-amber-900">
              Kasus ini sudah pernah dipakai sebagai dev set, jadi developer AI mungkin sudah melihatnya.
              Memindahkannya ke test bisa membuat skor resmi kurang objektif. Kasus akan ditandai
              &quot;pernah dev set&quot; selamanya.
            </p>
            <label className="flex items-start gap-2 text-xs font-medium text-amber-900">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
                className="mt-0.5"
              />
              Saya paham dan tetap ingin memindahkan kasus ini ke test.
            </label>
          </div>
        )}

        {error && (
          <div role="alert" className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
            {error}
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Simpan tag
          </button>
        </div>
      </div>
    </div>
  );
}
