
"use client";

import { useState } from "react";

import { useAttemptCalls } from "@/hooks/useAttemptCalls";
import { CHROME } from "@/lib/i18n/chrome";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { fill, messages } from "@/lib/i18n/locale";
import {
  callErrorText,
  callResultText,
  durationText,
  emptyCallsText,
  maskedNotice,
  rawResponseText,
  tryLabel,
} from "@/lib/runs/callDetail";
import {
  errorSummaryText,
  modelVersionText,
  type FailedAttempt,
} from "@/lib/runs/sessionErrors";
import type { AttemptCalls } from "@/types/measurement";

const COPY = messages({
  id: {
    region: "Ringkasan kegagalan",
    hide: "Sembunyikan detail teknis",
    show: "Lihat detail teknis",
    repetition: "Pengulangan ke-{n}",
    model: "Model {version}",
    hideProvider: "Tutup respons penyedia",
    showProvider: "Lihat respons penyedia",
    missingApi: "Pesan asli dari penyedia belum dikirim oleh API, jadi yang tampil baru panggilan mana yang gagal.",
    provider: "Respons penyedia",
    heading: "{code} · Pengulangan ke-{n}",
    loading: "Memuat detail teknis…",
  },
  en: {
    region: "Failure summary",
    hide: "Hide technical detail",
    show: "View technical detail",
    repetition: "Repetition {n}",
    model: "Model {version}",
    hideProvider: "Close provider response",
    showProvider: "View provider response",
    missingApi: "The API has not sent the provider's original message yet, so only which call failed is shown.",
    provider: "Provider response",
    heading: "{code} · Repetition {n}",
    loading: "Loading technical detail…",
  },
});

/**
 * Ringkasan kegagalan satu sesi dengan tombol detail teknis (PBI-12 AC4).
 * Respons asli penyedia dibaca hanya ketika pengguna membuka detailnya.
 */
export function SessionErrorSummary({
  sessionId,
  failures,
}: Readonly<{
  sessionId: string;
  failures: readonly FailedAttempt[];
}>) {
  const copy = useText(COPY);
  const chrome = useText(CHROME);
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [selectedFailure, setSelectedFailure] =
    useState<FailedAttempt | null>(null);

  const detail = useAttemptCalls(
    sessionId,
    selectedFailure?.attemptId ?? null
  );

  if (failures.length === 0) return null;

  const hasAttemptId = failures.some(
    (failure) => failure.attemptId !== null
  );

  return (
    <section
      aria-label={copy.region}
      className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-rose-900">
          {errorSummaryText(failures.length, locale)}
        </p>

        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            setSelectedFailure(null);
          }}
          aria-expanded={open}
          className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-sm font-medium text-rose-900 hover:bg-rose-100"
        >
          {open ? copy.hide : copy.show}
        </button>
      </div>

      {open && (
        <div className="space-y-2">
          <ul className="divide-y divide-rose-100 rounded-md border border-rose-100 bg-white">
            {failures.map((failure) => (
              <li
                key={failure.key}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2"
              >
                <span className="font-mono text-xs text-slate-500">
                  {failure.caseCode}
                </span>

                <span className="text-sm font-medium text-slate-900">
                  {failure.title}
                </span>

                <span className="text-xs text-slate-600">
                  {fill(copy.repetition, { n: failure.repetitionNo })}
                </span>

                <span className="text-xs text-slate-600">
                  {fill(copy.model, { version: modelVersionText(failure.modelVersion, locale) })}
                </span>

                {failure.attemptId !== null && (
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedFailure(
                        selectedFailure?.key === failure.key
                          ? null
                          : failure
                      )
                    }
                    aria-expanded={selectedFailure?.key === failure.key}
                    className="ml-auto rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {selectedFailure?.key === failure.key
                      ? copy.hideProvider
                      : copy.showProvider}
                  </button>
                )}
              </li>
            ))}
          </ul>

          {!hasAttemptId && (
            <p className="text-xs text-rose-900">
              {copy.missingApi}
            </p>
          )}

          {selectedFailure !== null && (
            <section
              aria-label={copy.provider}
              className="space-y-2 rounded-md border border-slate-200 bg-white p-3"
            >
              <p className="text-xs font-semibold text-slate-700">
                {fill(copy.heading, { code: selectedFailure.caseCode, n: selectedFailure.repetitionNo })}
              </p>

              {detail.status === "loading" && (
                <p className="text-xs text-slate-500">
                  {copy.loading}
                </p>
              )}

              {detail.status === "error" && (
                <div className="flex flex-wrap items-center gap-3">
                  <p className="text-xs text-slate-600">
                    {detail.message}
                  </p>

                  <button
                    type="button"
                    onClick={detail.reload}
                    className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    {chrome.retry}
                  </button>
                </div>
              )}

              {detail.status === "ready" &&
                detail.data !== null && (
                  <CallList calls={detail.data} locale={locale} />
                )}
            </section>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * Menampilkan setiap upaya panggilan beserta respons penyedia.
 * Respons mentah ditampilkan sebagai teks, bukan HTML.
 */
function CallList({
  calls,
  locale,
}: Readonly<{ calls: AttemptCalls; locale: ReturnType<typeof useLocale> }>) {
  const notice = calls.masked ? maskedNotice(locale) : null;

  return (
    <div className="space-y-3">
      {notice !== null && (
        <p className="text-xs text-amber-900">
          {notice}
        </p>
      )}

      {calls.calls.length === 0 ? (
        <p className="text-xs text-slate-500">
          {emptyCallsText(locale)}
        </p>
      ) : (
        <ol className="space-y-3">
          {calls.calls.map((call) => {
            const message = callErrorText(call);
            const raw = calls.masked
              ? null
              : rawResponseText(call.raw_response);

            return (
              <li
                key={call.try_no}
                className="space-y-1 rounded border border-slate-200 p-2"
              >
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                  <span className="font-medium text-slate-900">
                    {tryLabel(call, locale)}
                  </span>

                  <span>
                    {callResultText(call, locale)}
                  </span>

                  <span>
                    {durationText(call.duration_ms, locale)}
                  </span>

                  <span className="font-mono">
                    {call.model_version}
                  </span>
                </p>

                {message !== null && (
                  <p className="text-xs text-rose-900">
                    {message}
                  </p>
                )}

                {raw !== null && (
                  <pre className="max-h-64 overflow-auto rounded bg-slate-50 px-2 py-1 font-mono text-xs break-words whitespace-pre-wrap text-slate-800">
                    {raw}
                  </pre>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
