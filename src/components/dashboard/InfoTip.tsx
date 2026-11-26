import { useId } from "react";

import { Icon } from "@/components/ui/Icon";

/** Info icon whose explanation shows on hover and on keyboard focus, so it is never mouse-only. */
export function InfoTip({ text, tone }: Readonly<{ text: string; tone: "accent" | "orange" }>) {
  const tipId = useId();
  return (
    <span className="group relative inline-flex">
      <button
        type="button"
        aria-label="Penjelasan"
        aria-describedby={tipId}
        className={`grid place-items-center rounded-full ${tone === "accent" ? "text-accent" : "text-[#ff6a1f]"}`}
      >
        <Icon name={tone === "accent" ? "info" : "peringatan"} size={14} />
      </button>
      <span
        id={tipId}
        role="tooltip"
        className="pointer-events-none invisible absolute bottom-full left-1/2 z-10 mb-2 w-max max-w-60 -translate-x-1/2 rounded-control bg-ink-hover px-3 py-2 text-xs leading-4 text-paper opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        {text}
      </span>
    </span>
  );
}
