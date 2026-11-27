import type { ButtonHTMLAttributes } from "react";

export type ButtonVariant = "primary" | "accent" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

const LAYOUT = "inline-flex items-center gap-1.5 rounded-control font-sans transition-colors";
const INTERACTIVE =
  "cursor-pointer disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-ink";

// One row per look: a new variant is a new entry, Button itself does not change.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-0 bg-ink text-paper hover:bg-ink-hover",
  accent: "border-0 bg-accent text-paper hover:bg-accent-hover",
  ghost: "border border-line bg-paper text-ink hover:bg-surface disabled:border-transparent",
  danger: "border-0 bg-danger text-paper hover:bg-danger-strong",
};

/**
 * The turned-off look for an element that is not a <button> (a link with nowhere to go), the same as a disabled
 * Button. Written out instead of the disabled: variant, which only works on form elements.
 */
const TURNED_OFF: Record<ButtonVariant, string> = {
  primary: "cursor-not-allowed border-0 bg-disabled-bg text-disabled-ink",
  accent: "cursor-not-allowed border-0 bg-disabled-bg text-disabled-ink",
  ghost: "cursor-not-allowed border border-transparent bg-disabled-bg text-disabled-ink",
  danger: "cursor-not-allowed border-0 bg-disabled-bg text-disabled-ink",
};

// One line and a fixed height, or (multiline) a minimum height so long text such as a case code can wrap.
const SIZES: Record<ButtonSize, { line: string; multiline: string }> = {
  md: { line: "h-9 px-3.5 text-sm", multiline: "min-h-9 px-3.5 py-2 text-sm" },
  sm: { line: "h-8 px-3 text-[13px]", multiline: "min-h-8 px-3 py-1.5 text-[13px]" },
};

export type ButtonLook = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** The turned-off look, for a link or span that cannot use the disabled attribute. */
  disabled?: boolean;
  /** Let the content wrap onto more lines instead of one fixed-height line. */
  multiline?: boolean;
};

/**
 * The classes of a Button, for links and other elements that must look like one (review #135, PBI-25 one look).
 * Button uses this too, so a change here updates every button-looking link. No two classes set the same property,
 * so the result never depends on the order of the generated CSS.
 */
export function buttonClasses({ variant = "primary", size = "md", disabled = false, multiline = false }: ButtonLook = {}): string {
  const look = disabled ? TURNED_OFF[variant] : `${INTERACTIVE} ${VARIANTS[variant]}`;
  const flow = multiline ? "flex-wrap justify-start text-left leading-snug" : "justify-center whitespace-nowrap leading-none";
  return `${LAYOUT} ${flow} ${look} ${multiline ? SIZES[size].multiline : SIZES[size].line}`;
}

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
      className={`${buttonClasses({ variant, size })} ${className}`.trim()}
      {...rest}
    />
  );
}
