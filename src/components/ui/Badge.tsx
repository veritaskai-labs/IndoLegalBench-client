import type { ReactNode } from "react";

export type BadgeTone = "gray" | "blue" | "amber" | "green";

const TONES: Record<BadgeTone, string> = {
  gray: "bg-surface text-ink-soft",
  blue: "bg-accent-wash text-accent-ink",
  amber: "bg-warning-wash text-warning-ink",
  green: "bg-success-wash text-success-ink",
};

type Props = {
  tone?: BadgeTone;
  /** Small coloured dot before the label, same as the status pills in the prototype. */
  dot?: boolean;
  children: ReactNode;
};

export function Badge({ tone = "gray", dot = false, children }: Readonly<Props>) {
  return (
    <span
      className={`inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap rounded-tag px-2 text-xs font-medium ${TONES[tone]}`}
    >
      {dot && <span data-dot aria-hidden="true" className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}
