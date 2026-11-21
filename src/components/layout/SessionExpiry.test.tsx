import { act, fireEvent, render, screen } from "@testing-library/react";
import { useEffect, useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { onUnauthorized } from "@/lib/apiClient";
import {
  ABSOLUTE_EXPIRES_HEADER,
  IDLE_DEADLINE_HEADER,
  SESSION_CLOCK_STORAGE_KEY,
  observeServerDeadlines,
  resetSessionClock,
} from "@/lib/sessionClock";
import { AuthGuard } from "./AuthGuard";
import { SessionExpiry } from "./SessionExpiry";

// SCRUM-254 AC7: fake timers around the warning, the deadline, activity versus
// polling, a second tab, wake, and a session that is already over.

const ABSOLUTE = "2026-11-08T12:00:00.000Z";
const IDLE = "2026-11-08T10:30:00.000Z";
const OPEN = "2026-11-08T10:00:00.000Z";
const WARNING = "2026-11-08T10:29:00.000Z";
const WARNING_TEXT = "Sesi Anda akan berakhir dalam 60 detik karena tidak ada aktivitas.";

const { replaceMock, useAuthMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

// jsdom cannot construct a trusted event. The isTrusted gate is asserted on the
// pure helper; here the event type is what decides whether a renewal is sent.
vi.mock("@/lib/sessionClock", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sessionClock")>();
  return {
    ...actual,
    isDeliberateActivity: (event: { type: string }) =>
      event.type === "pointerdown" || event.type === "keydown" || event.type === "wheel",
  };
});

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));

const fetchMock = vi.fn();

function activity(type: string) {
  return new Event(type, { bubbles: true, cancelable: true });
}

function seed(idleDeadline: string, absoluteExpires = ABSOLUTE) {
  observeServerDeadlines({
    get: (name) => {
      if (name === IDLE_DEADLINE_HEADER) return idleDeadline;
      if (name === ABSOLUTE_EXPIRES_HEADER) return absoluteExpires;
      return null;
    },
  });
}

function deferredResponse() {
  let resolve: (response: Response) => void = () => undefined;
  const pending = new Promise<Response>((done) => {
    resolve = done;
  });
  fetchMock.mockReturnValue(pending);
  return resolve;
}

function responseWith(idleDeadline: string, absoluteExpires = ABSOLUTE) {
  return new Response(JSON.stringify({ id: "u1" }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      [IDLE_DEADLINE_HEADER]: idleDeadline,
      [ABSOLUTE_EXPIRES_HEADER]: absoluteExpires,
    },
  });
}

function activityHeader(call: number) {
  const init = fetchMock.mock.calls[call]?.[1] as RequestInit | undefined;
  return new Headers(init?.headers).get("X-Veritask-Activity");
}

function Poller({ poll }: { poll: () => void }) {
  useEffect(() => {
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [poll]);
  return <p>protected content</p>;
}

function Harness({ children }: { children?: ReactNode }) {
  const [ended, setEnded] = useState(false);
  useEffect(() => onUnauthorized(() => setEnded(true)), []);
  if (ended) return <p>login</p>;
  return (
    <>
      {children ?? <p>protected content</p>}
      <SessionExpiry />
    </>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(OPEN));
  resetSessionClock();
  localStorage.clear();
  replaceMock.mockReset();
  useAuthMock.mockReset().mockReturnValue({
    status: "authenticated",
    user: { id: "u1", name: "Uji", email: "uji@veritask.test", role: "viewer" },
  });
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockResolvedValue(responseWith(IDLE));
});

afterEach(() => {
  resetSessionClock();
  localStorage.clear();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("SessionExpiry", () => {
  it("shows the Indonesian warning 60 seconds before the earlier deadline and keeps the page", async () => {
    seed(IDLE);
    vi.setSystemTime(new Date(WARNING));

    await act(async () => {
      render(<Harness />);
    });

    expect(screen.getByRole("dialog")).toHaveTextContent(WARNING_TEXT);
    expect(screen.getByRole("button", { name: "Lanjutkan sesi" })).toBeEnabled();
    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stays quiet one second before the warning", async () => {
    seed(IDLE);
    vi.setSystemTime(new Date(Date.parse(WARNING) - 1000));

    await act(async () => {
      render(<Harness />);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });

  it("clears the page at the deadline without waiting for a business call", async () => {
    seed(IDLE);
    const resolve = deferredResponse();
    const poll = vi.fn();
    await act(async () => {
      render(
        <Harness>
          <Poller poll={poll} />
        </Harness>,
      );
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(poll).toHaveBeenCalled();

    await act(async () => {
      vi.setSystemTime(new Date(IDLE));
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.getByText("login")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/me$/);
    expect(activityHeader(0)).toBe("passive");
    const pollsAtLogout = poll.mock.calls.length;

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(poll.mock.calls.length).toBe(pollsAtLogout);

    await act(async () => {
      resolve(responseWith("2026-11-08T11:30:00.000Z"));
      await Promise.resolve();
    });

    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.getByText("login")).toBeInTheDocument();
  });

  it("logs out on wake when the deadline passed while the timer was asleep", async () => {
    seed(IDLE);
    await act(async () => {
      render(<Harness />);
    });

    await act(async () => {
      vi.setSystemTime(new Date(IDLE));
      document.dispatchEvent(new Event("visibilitychange"));
    });

    expect(screen.getByText("login")).toBeInTheDocument();
    expect(activityHeader(0)).toBe("passive");
  });

  // Edge (SCRUM-253 AC4): Back after leaving the app can restore this page from the browser's
  // back/forward cache. The page comes back frozen as it was, with no reload, no /me and no
  // visibilitychange; only `pageshow` fires. If that event were not handled, the old protected
  // screen would stay visible until the next one-second tick or click, past the deadline.
  it("logs out at once when Back restores the page from the back/forward cache after the deadline", async () => {
    seed(IDLE);
    await act(async () => {
      render(<Harness />);
    });

    await act(async () => {
      vi.setSystemTime(new Date(IDLE));
      const restored = new Event("pageshow");
      Object.defineProperty(restored, "persisted", { value: true });
      window.dispatchEvent(restored);
    });

    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.getByText("login")).toBeInTheDocument();
  });

  it("logs out immediately when the deadlines are already past", async () => {
    vi.setSystemTime(new Date(IDLE));
    seed(IDLE);

    await act(async () => {
      render(<Harness />);
    });

    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(screen.getByText("login")).toBeInTheDocument();
  });

  it("renews on a trusted pointer, key, or wheel, and ignores movement and a second burst", async () => {
    seed(IDLE);
    await act(async () => {
      render(<Harness />);
    });

    await act(async () => {
      window.dispatchEvent(activity("pointermove"));
      window.dispatchEvent(activity("pointerdown"));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/me$/);
    expect(activityHeader(0)).toBeNull();

    await act(async () => {
      window.dispatchEvent(activity("keydown"));
      window.dispatchEvent(activity("wheel"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    fetchMock.mockResolvedValue(responseWith("2026-11-08T11:30:00.000Z"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
      window.dispatchEvent(activity("keydown"));
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(activityHeader(1)).toBeNull();
  });

  it("does not renew from the warning, and Escape does not dismiss it", async () => {
    seed(IDLE);
    vi.setSystemTime(new Date(WARNING));
    await act(async () => {
      render(<Harness />);
    });

    await act(async () => {
      window.dispatchEvent(activity("pointerdown"));
      fireEvent(screen.getByRole("dialog"), new Event("cancel", { bubbles: true, cancelable: true }));
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toHaveTextContent(WARNING_TEXT);
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });

  // The cancel event does not bubble, so a React onCancel on the dialog never
  // sees Escape in a browser. The listener on the element itself has to cancel it.
  it("cancels the native dialog dismiss so Escape cannot close it", async () => {
    seed(IDLE);
    vi.setSystemTime(new Date(WARNING));
    await act(async () => {
      render(<Harness />);
    });

    const dialog = screen.getByRole("dialog");
    const cancel = new Event("cancel", { bubbles: false, cancelable: true });
    dialog.dispatchEvent(cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(dialog.getAttribute("closedby")).toBe("none");
    expect(dialog.getAttribute("aria-describedby")).toBe("session-expiry-reason");
    expect(document.getElementById("session-expiry-reason")).toHaveTextContent(WARNING_TEXT);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("continues only while the server session is still inside the deadline", async () => {
    seed(IDLE);
    vi.setSystemTime(new Date(WARNING));
    fetchMock.mockResolvedValue(responseWith("2026-11-08T11:30:00.000Z"));
    await act(async () => {
      render(<Harness />);
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Lanjutkan sesi" }));
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(activityHeader(0)).toBeNull();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });

  it("does not send a renewing request when Lanjutkan is clicked after the deadline", async () => {
    seed(IDLE);
    vi.setSystemTime(new Date(WARNING));
    await act(async () => {
      render(<Harness />);
    });

    await act(async () => {
      vi.setSystemTime(new Date(IDLE));
      fireEvent.click(screen.getByRole("button", { name: "Lanjutkan sesi" }));
    });

    expect(screen.getByText("login")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(activityHeader(0)).toBe("passive");
  });

  it("logs the other tabs of this login out and ignores a different login", async () => {
    seed(IDLE);
    await act(async () => {
      render(<Harness />);
    });

    await act(async () => {
      const other = JSON.stringify({
        absoluteExpires: "2026-11-08T18:00:00.000Z",
        idleDeadline: "2026-11-08T17:00:00.000Z",
        lost: true,
      });
      localStorage.setItem(SESSION_CLOCK_STORAGE_KEY, other);
      window.dispatchEvent(new StorageEvent("storage", { key: SESSION_CLOCK_STORAGE_KEY, newValue: other }));
    });
    expect(screen.getByText("protected content")).toBeInTheDocument();

    await act(async () => {
      const same = JSON.stringify({ absoluteExpires: ABSOLUTE, idleDeadline: IDLE, lost: true });
      localStorage.setItem(SESSION_CLOCK_STORAGE_KEY, same);
      window.dispatchEvent(new StorageEvent("storage", { key: SESSION_CLOCK_STORAGE_KEY, newValue: same }));
    });

    expect(screen.getByText("login")).toBeInTheDocument();
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  it("follows a renewal published by the other tab", async () => {
    seed(IDLE);
    vi.setSystemTime(new Date(WARNING));
    await act(async () => {
      render(<Harness />);
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await act(async () => {
      const renewed = JSON.stringify({
        absoluteExpires: ABSOLUTE,
        idleDeadline: "2026-11-08T11:30:00.000Z",
        lost: false,
      });
      localStorage.setItem(SESSION_CLOCK_STORAGE_KEY, renewed);
      window.dispatchEvent(new StorageEvent("storage", { key: SESSION_CLOCK_STORAGE_KEY, newValue: renewed }));
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByText("protected content")).toBeInTheDocument();
  });
});

describe("AuthGuard", () => {
  it("shows the warning over protected content for a signed-in role", async () => {
    seed(IDLE);
    vi.setSystemTime(new Date(WARNING));

    await act(async () => {
      render(
        <AuthGuard>
          <p>protected content</p>
        </AuthGuard>,
      );
    });

    expect(screen.getByRole("dialog")).toHaveTextContent(WARNING_TEXT);
    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("uses the shared logout path when the deadline passes", async () => {
    seed(IDLE);
    await act(async () => {
      render(
        <AuthGuard>
          <p>protected content</p>
        </AuthGuard>,
      );
    });

    await act(async () => {
      vi.setSystemTime(new Date(IDLE));
      await vi.advanceTimersByTimeAsync(1000);
    });

    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
    expect(replaceMock).toHaveBeenCalledWith("/login?reason=expired");
  });
});
