"use client";

import Link from "next/link";
import { messages } from "@/lib/i18n/locale";
import { useText } from "@/lib/i18n/LocaleProvider";

const LINKS = [
  { href: "/suites", key: "suites" },
  { href: "/cases", key: "cases" },
  { href: "/cases/import", key: "import" },
] as const;

const NAV_COPY = messages({
  id: {
    label: "Suite dan kasus",
    suites: "Daftar suite",
    cases: "Daftar kasus",
    import: "Impor CSV",
  },
  en: {
    label: "Suites and cases",
    suites: "Suite list",
    cases: "Case list",
    import: "Impor CSV",
  },
});

export function SuiteCaseNav({ current }: Readonly<{ current: (typeof LINKS)[number]["href"] }>) {
  const copy = useText(NAV_COPY);
  return (
    <nav aria-label={copy.label} className="flex gap-1 overflow-x-auto border-b border-line-soft">
      {LINKS.map(({ href, key }) => {
        const label = copy[key];
        return (
        <Link
          key={href}
          href={href}
          aria-current={current === href ? "page" : undefined}
          className={`-mb-px whitespace-nowrap border-b-2 px-5 pb-3 pt-2 text-sm font-medium transition-colors ${
            current === href
              ? "border-ink text-ink"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          {label}
        </Link>
        );
      })}
    </nav>
  );
}
