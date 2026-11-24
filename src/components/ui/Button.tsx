import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "accent" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

const BASE =
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control font-sans leading-none transition-colors cursor-pointer disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-ink";

// One row per look: a new variant is a new entry, Button itself does not change.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-0 bg-ink text-paper hover:bg-ink-hover",
  accent: "border-0 bg-accent text-paper hover:bg-accent-hover",
  ghost: "border border-line bg-paper text-ink hover:bg-surface disabled:border-transparent",
  danger: "border-0 bg-danger text-paper hover:bg-danger-strong",
};

const SIZES: Record<ButtonSize, string> = {
  md: "h-9 px-3.5 text-sm",
  sm: "h-8 px-3 text-[13px]",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  ...rest
}: Readonly<Props>) {
  return (
    <button
      type={type}
      className={`${BASE} ${VARIANTS[variant]} ${SIZES[size]} ${className}`.trim()}
      {...rest}
    />
  );
}
