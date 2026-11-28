"use client";

import { useState } from "react";
import { Button, FormField, Input } from "@/components/ui";
import { ApiError, apiFetch } from "@/lib/apiClient";
import { CHROME } from "@/lib/i18n/chrome";
import { messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";
import type { Suite } from "@/types/suite";

const COPY = messages({
  id: {
    edit: "Ubah suite",
    create: "Buat suite",
    nameRequired: "Nama wajib diisi.",
    nameTaken: "Nama suite sudah dipakai. Pilih nama lain.",
    saveFailed: "Gagal menyimpan suite. Coba lagi.",
    name: "Nama",
    description: "Deskripsi",
    save: "Simpan",
  },
  en: {
    edit: "Edit suite",
    create: "Create suite",
    nameRequired: "Name is required.",
    nameTaken: "That suite name is already used. Choose another.",
    saveFailed: "Could not save the suite. Try again.",
    name: "Name",
    description: "Description",
    save: "Save",
  },
});

type Props = {
  /** Tanpa suite berarti buat baru, dengan suite berarti ubah */
  suite?: Suite;
  onClose: () => void;
  onSaved: () => void;
};

export function SuiteFormDialog({ suite, onClose, onSaved }: Readonly<Props>) {
  const copy = useText(COPY);
  const chrome = useText(CHROME);
  const [name, setName] = useState(suite?.name ?? "");
  const [description, setDescription] = useState(suite?.description ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const trimmed = name.trim();

    if (trimmed === "") {
      setNameError(copy.nameRequired);
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
        setNameError(copy.nameTaken);
      } else {
        setFormError(copy.saveFailed);
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4">
      <dialog
        open
        aria-modal="true"
        aria-label={suite ? copy.edit : copy.create}
        className="static m-0 w-full max-w-[520px] rounded-dialog bg-paper p-6 text-ink shadow-dialog"
      >
        <h2 className="font-serif text-[22px] font-medium leading-7 text-ink">
          {suite ? copy.edit : copy.create}
        </h2>

        {formError && (
          <div
            role="alert"
            className="mt-4 rounded-control bg-danger-wash px-3 py-2 text-xs text-danger"
          >
            {formError}
          </div>
        )}

        <div className="mt-4 space-y-4">
          <FormField label={copy.name} error={nameError ?? undefined}>
            {(control) => (
              <Input
                {...control}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            )}
          </FormField>

          <FormField label={copy.description}>
            {(control) => (
              <textarea
                {...control}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                className="w-full rounded-control border border-line bg-paper px-3 py-2 text-sm text-ink placeholder:text-subtle"
              />
            )}
          </FormField>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            {chrome.cancel}
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={saving}>
            {copy.save}
          </Button>
        </div>
      </dialog>
    </div>
  );
}
