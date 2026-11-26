import { ICON, type IconName } from "@/lib/icons";

/** Decorative line icon; the control around it carries the accessible name. */
export function Icon({ name, size = 16, className = "" }: Readonly<{ name: IconName; size?: number; className?: string }>) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`.trim()}
    >
      <path d={ICON[name]} />
    </svg>
  );
}
