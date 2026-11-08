"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, endExpiredSession } from "@/lib/apiClient";
import {
  SESSION_CLOCK_STORAGE_KEY,
  applyPeerRecord,
  clockPhase,
  currentDeadlines,
  isDeliberateActivity,
  phaseAt,
  renewalDue,
  subscribeSessionClock,
  type ClockPhase,
} from "@/lib/sessionClock";

const WARNING_TEXT = "Sesi Anda akan berakhir dalam 60 detik karena tidak ada aktivitas.";

function openAsModal(dialog: HTMLDialogElement | null) {
  if (!dialog) return;
  // Escape closes a modal dialog before React's onCancel runs. closedby=none
  // turns that dismiss off, and the native cancel listener covers browsers
  // that ignore the attribute. The cancel event does not bubble.
  dialog.setAttribute("closedby", "none");
  const blockDismiss = (event: Event) => {
    event.preventDefault();
  };
  const blockEscape = (event: KeyboardEvent) => {
    if (event.key === "Escape") event.preventDefault();
  };
  dialog.addEventListener("cancel", blockDismiss);
  dialog.addEventListener("keydown", blockEscape);
  try {
    if (typeof dialog.showModal === "function" && !dialog.open) dialog.showModal();
    else dialog.setAttribute("open", "");
  } catch {
    dialog.setAttribute("open", "");
  }
  return () => {
    dialog.removeEventListener("cancel", blockDismiss);
    dialog.removeEventListener("keydown", blockEscape);
  };
}

/**
 * Warns 60 seconds before the earlier server deadline and then uses the same
 * logout as a 401. Polls and cursor movement do not renew the session.
 */
export function SessionExpiry() {
  const [phase, setPhase] = useState<ClockPhase>("pending");
  const [busy, setBusy] = useState(false);
  const lastRenewal = useRef<number | null>(null);
  const phaseRef = useRef<ClockPhase>("pending");
  const ending = useRef(false);

  useEffect(() => {
    const finish = () => {
      if (ending.current) return;
      ending.current = true;
      endExpiredSession();
    };
    const sync = () => {
      const next = clockPhase(Date.now());
      phaseRef.current = next;
      if (next === "expired") {
        finish();
        return;
      }
      setPhase(next);
    };
    sync();
    const unsubscribe = subscribeSessionClock(sync);
    const timer = window.setInterval(sync, 1000);
    window.addEventListener("focus", sync);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", sync);
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SESSION_CLOCK_STORAGE_KEY) return;
      if (applyPeerRecord(event.newValue) === "lost") finish();
      else sync();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener("focus", sync);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (phase !== "active") return;
    const onActivity = (event: Event) => {
      if (!isDeliberateActivity(event)) return;
      const now = Date.now();
      if (!renewalDue(lastRenewal.current, now, phaseRef.current)) return;
      lastRenewal.current = now;
      void apiFetch("/me").catch(() => undefined);
    };
    window.addEventListener("pointerdown", onActivity);
    window.addEventListener("keydown", onActivity);
    window.addEventListener("wheel", onActivity);
    return () => {
      window.removeEventListener("pointerdown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("wheel", onActivity);
    };
  }, [phase]);

  async function continueSession() {
    if (busy) return;
    // A click on the deadline, or after it, must not send a request that refreshes activity.
    if (phaseAt(currentDeadlines(), Date.now()) !== "warning") {
      if (!ending.current) {
        ending.current = true;
        endExpiredSession();
      }
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/me");
    } catch {
      return;
    } finally {
      setBusy(false);
    }
    if (phaseAt(currentDeadlines(), Date.now()) === "expired" && !ending.current) {
      ending.current = true;
      endExpiredSession();
    }
  }

  if (phase !== "warning") return null;

  return (
    <dialog
      ref={openAsModal}
      aria-labelledby="session-expiry-title"
      aria-describedby="session-expiry-reason"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-slate-200 bg-white p-6 text-slate-900 shadow-lg backdrop:bg-slate-900/40"
    >
      <h2 id="session-expiry-title" className="text-base font-medium">
        Sesi akan berakhir
      </h2>
      <p id="session-expiry-reason" className="mt-2 text-sm text-slate-600">
        {WARNING_TEXT}
      </p>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => void continueSession()}
          disabled={busy}
          className="rounded-md bg-indigo-900 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-800 disabled:opacity-60"
        >
          Lanjutkan sesi
        </button>
      </div>
    </dialog>
  );
}
