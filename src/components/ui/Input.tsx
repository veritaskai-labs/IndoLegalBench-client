import type { InputHTMLAttributes } from "react";

export function Input({ className = "", ...rest }: Readonly<InputHTMLAttributes<HTMLInputElement>>) {
  return (
    <input
      className={`h-9 w-full rounded-control border border-line bg-paper px-3 text-sm text-ink placeholder:text-subtle aria-[invalid=true]:border-danger ${className}`.trim()}
      {...rest}
    />
  );
}
