"use client";

import { useId, useState } from "react";
import { ApiError, apiFetch } from "@/lib/apiClient";
import type { Suite } from "@/types/suite";

type Props = {
  /** Tanpa suite berarti buat baru, dengan suite berarti ubah */
  suite?: Suite;
  onClose: () => void;
  onSaved: () => void;
};

export function SuiteFormDialog({ suite, onClose, onSaved }: Props) {
  const nameId = useId();
  const descriptionId = useId();

  const [name, setName] = useState(suite?.name ?? "");
  const [description, setDescription] = useState(suite?.description ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const trimmed = name.trim();

    if (trimmed === "") {
      setNameError("Nama wajib diisi.");
      return;
    }

    setNameError(null);
    setFormError(null);
    setSaving(true);

    const body = JSON.stringify({
      name: trimmed,
      description: description.trim() === "" ? null : description.trim(),
    });

    try {
      if (suite) {
        await apiFetch(`/suites/${suite.id}`, { method: "PATCH", body });
      } else {
        await apiFetch("/suites", { method: "POST", body });
      }
      onSaved();
    } catch (error) {
      if (error instanceof ApiError && error.code === "SUITE_NAME_TAKEN") {
        setNameError("Nama suite sudah dipakai. Pilih nama lain.");
      } else {
        setFormError("Gagal menyimpan suite. Coba lagi.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={suite ? "Ubah suite" : "Buat suite"}
        className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 className="text-base font-semibold text-slate-900">
          {suite ? "Ubah suite" : "Buat suite"}
        </h2>

        {formError && (
          <div
            role="alert"
            className="mt-4 rounded-md bg-red-50 px-3 py-2 text-xs text-red-800"
          >
            {formError}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <div>
            <label
              htmlFor={nameId}
              className="block text-sm font-medium text-slate-700"
            >
              Nama
            </label>
            <input
              id={nameId}
              value={name}
              onChange={(event) => setName(event.target.value)}
              aria-invalid={nameError !== null}
              aria-describedby={nameError ? `${nameId}-error` : undefined}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            {nameError && (
              <p id={`${nameId}-error`} className="mt-1 text-xs text-red-700">
                {nameError}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor={descriptionId}
              className="block text-sm font-medium text-slate-700"
            >
              Deskripsi
            </label>
            <textarea
              id={descriptionId}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

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
            onClick={handleSubmit}
            disabled={saving}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Simpan
          </button>
        </div>
      </div>
    </div>
  );
}