"use client";

import { fill } from "@/lib/i18n/locale";
import { CHROME } from "@/lib/i18n/chrome";
import { useText } from "@/lib/i18n/LocaleProvider";
import { Button } from "./Button";

type Props = {
  page: number;
  lastPage: number;
  onPageChange: (page: number) => void;
};

export function Pager({ page, lastPage, onPageChange }: Readonly<Props>) {
  const chrome = useText(CHROME);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
      <span>{fill(chrome.page, { page, last: lastPage })}</span>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>
          {chrome.previous}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onPageChange(page + 1)} disabled={page >= lastPage}>
          {chrome.next}
        </Button>
      </div>
    </div>
  );
}
