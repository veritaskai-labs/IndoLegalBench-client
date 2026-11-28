"use client";

import { CHROME } from "@/lib/i18n/chrome";
import { useText } from "@/lib/i18n/LocaleProvider";

/** Loading state (spinner + label). The caller can pass its own sentence. */
export function LoadingState({ label }: Readonly<{ label?: string }>) {
  const chrome = useText(CHROME);
  return (
    <output className="flex items-center justify-center gap-3 p-10 text-sm text-muted">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-ink" />
      {label ?? chrome.loading}
    </output>
  );
}
