import type { ReactNode } from "react";

export type MessageLevel = "error" | "warning";

const LEVEL: Readonly<Record<MessageLevel, { label: string; tone: string; icon: string }>> = {
  error: {
    label: "Error",
    tone: "border-red-200 bg-red-50 text-red-800",
    // Lingkaran dengan tanda silang.
    icon: "M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  warning: {
    label: "Peringatan",
    tone: "border-amber-200 bg-amber-50 text-amber-900",
    // Segitiga dengan tanda seru.
    icon: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z",
  },
};

/**
 * Satu pesan hasil pemeriksaan. Tingkatnya terbaca dari warna, ikon, dan label teks sekaligus, jadi tidak
 * bergantung pada warna saja: error menahan tombol Buat laporan, peringatan tidak.
 */
export function ValidationMessage({ level, children }: Readonly<{ level: MessageLevel; children: ReactNode }>) {
  const { label, tone, icon } = LEVEL[level];
  return (
    <p data-level={level} className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${tone}`}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth="1.5"
        stroke="currentColor"
        className="mt-0.5 h-4 w-4 shrink-0"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
      </svg>
      <span>
        <span className="font-semibold">{label}:</span> {children}
      </span>
    </p>
  );
}
