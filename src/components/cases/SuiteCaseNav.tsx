import Link from "next/link";

const LINKS = [
  { href: "/suites", label: "Suite" },
  { href: "/cases", label: "Daftar kasus" },
] as const;

export function SuiteCaseNav({ current }: Readonly<{ current: (typeof LINKS)[number]["href"] }>) {
  return (
    <nav aria-label="Suite dan kasus" className="flex gap-1 border-b border-slate-200">
      {LINKS.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={current === href ? "page" : undefined}
          className={`border-b-2 px-4 py-2 text-sm font-medium ${current === href
            ? "border-indigo-600 text-indigo-700"
            : "border-transparent text-slate-600 hover:text-slate-900"}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
