"use client";

import { useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";

const COPY = messages({
  id: "Kredensial berakhiran {hint}",
  en: "Credential ending in {hint}",
});

type Props = {
  /** 4 karakter terakhir dari server (credential_hint). */
  hint: string;
  className?: string;
};

/**
 * Petunjuk kredensial tersimpan (SCRUM-118): hanya 4 karakter terakhir yang
 * pernah dikirim server, sisanya disamarkan. Label aksesibelnya tidak
 * membacakan titik-titik.
 */
export function CredentialHint({ hint, className = "" }: Props) {
  const label = fill(useText(COPY), { hint });
  return (
    <span
      aria-label={label}
      className={`font-mono text-xs text-slate-600 ${className}`}
    >
      <span aria-hidden="true">••••{hint}</span>
    </span>
  );
}
