import type { ReactNode } from "react";

/**
 * Satu bagian form versi baru (SCRUM-375 B): judul serif di pita abu-abu, isi di bawahnya. id dipakai
 * navigasi bagian (tautan #id), scroll-mt menjaga judulnya tidak tertutup header yang menempel.
 */
export function FormCard({
  id,
  title,
  action,
  children,
}: Readonly<{ id: string; title: string; action?: ReactNode; children: ReactNode }>) {
  const headingId = `${id}-judul`;
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-28 overflow-hidden rounded-control border border-line bg-paper">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-3 sm:px-5">
        <h2 id={headingId} className="font-serif text-lg leading-6 text-ink">
          {title}
        </h2>
        {action}
      </div>
      <div className="space-y-4 p-4 sm:p-5">{children}</div>
    </section>
  );
}
