import Link from "next/link";

const LINKS = [
  { href: "/suites", label: "Daftar suite" },
  { href: "/cases", label: "Daftar kasus" },
  { href: "/cases/import", label: "Impor CSV" },
] as const;

export function SuiteCaseNav({ current }: Readonly<{ current: (typeof LINKS)[number]["href"] }>) {
  return (
    <nav aria-label="Suite dan kasus" className="flex gap-1 overflow-x-auto border-b border-line-soft">
      {LINKS.map(({ href, label }) => (
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
      ))}
    </nav>
  );
}
