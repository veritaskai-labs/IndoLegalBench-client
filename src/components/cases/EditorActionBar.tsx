"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui";
import { messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";

const COPY = messages({
  id: { legend: "Aksi kasus", save: "Simpan draf" },
  en: { legend: "Case actions", save: "Save draft" },
});

type Props = {
  saving: boolean;
  /** Aksi lain yang berdampingan dengan Simpan draf, misalnya Ajukan review. */
  children?: ReactNode;
};

/**
 * Bar aksi editor kasus: Simpan draf dan aksi lain berdampingan, mengambang di bawah layar
 * saat halaman digulir. Hanya tata letak; form dan halaman yang memegang logikanya.
 */
export function EditorActionBar({ saving, children }: Readonly<Props>) {
  const copy = useText(COPY);
  return (
    <div className="pointer-events-none sticky bottom-0 z-10 pt-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <fieldset className="m-0 min-w-0 border-0 p-0">
        <legend className="sr-only">{copy.legend}</legend>
        <div className="pointer-events-auto flex flex-wrap items-end justify-end gap-3">
          <Button type="submit" variant="primary" disabled={saving} className="shadow-menu">
            {copy.save}
          </Button>
          {children}
        </div>
      </fieldset>
    </div>
  );
}
