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
  return (
    <span
      aria-label={`Kredensial berakhiran ${hint}`}
      className={`font-mono text-xs text-slate-600 ${className}`}
    >
      <span aria-hidden="true">••••{hint}</span>
    </span>
  );
}
