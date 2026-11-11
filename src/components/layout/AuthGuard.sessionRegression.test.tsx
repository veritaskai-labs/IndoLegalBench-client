import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// SCRUM-253 AC3/AC4: session-expiry regression through the real chain a protected page uses:
// AuthProvider (/me) -> AuthGuard (401 handling) -> usePolledResource (page data via apiFetch).
// Only fetch and the router are faked, so a cache or retry added later in any of those layers
// would show up here.

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

import { AuthProvider } from "@/hooks/useAuth";
import { usePolledResource } from "@/hooks/usePolledResource";
import { apiFetch } from "@/lib/apiClient";
import { resetSessionClock } from "@/lib/sessionClock";
import { AuthGuard } from "./AuthGuard";

const ME = { id: "u1", name: "Uji Kontributor", email: "kontributor@veritask.test", role: "contributor" };
const POLL_MS = 1000;

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

type Route = (path: string) => Promise<Response>;

const fetchMock = vi.fn();

function routeFetch(route: Route) {
  fetchMock.mockImplementation((url: string) => route(new URL(url).pathname));
}

function calls(path: string) {
  return fetchMock.mock.calls.filter(([url]) => new URL(url as string).pathname === path).length;
}

/** A page that shows server data and keeps polling it, like the dashboard. */
function SecretPage() {
  const data = usePolledResource<{ total: number }>({
    requestKey: "secret",
    load: (passive) =>
      apiFetch("/dashboard", passive ? { activity: "passive" } : {}),
    toMessage: () => "gagal",
    shouldPoll: () => true,
    intervalMs: POLL_MS,
  });
  if (data.status !== "ready") return <p>memuat data</p>;
  return <p>Total rahasia {data.data.total}</p>;
}

/** Same nesting as app/(protected)/layout.tsx. */
function ProtectedPage() {
  return (
    <AuthProvider>
      <AuthGuard>
        <SecretPage />
      </AuthGuard>
    </AuthProvider>
  );
}

beforeEach(() => {
  resetSessionClock();
  localStorage.clear();
  replaceMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  resetSessionClock();
  localStorage.clear();
});

describe("protected page session-expiry regression (SCRUM-253)", () => {
  // Edge: a poll can fail without any HTTP answer (Wi-Fi drop, API restart during a deploy).
  // Only a 401 means the session is over. If a network error also cleared the page, every short
  // blip would throw the user out mid-work; the session is still valid, so the page must stay.
  it("keeps the page when a poll fails on the network, and still clears it on the next 401", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    let dashboard: () => Promise<Response> = () => Promise.resolve(json(200, { total: 7 }));
    routeFetch((path) => (path === "/me" ? Promise.resolve(json(200, ME)) : dashboard()));

    render(<ProtectedPage />);
    expect(await screen.findByText("Total rahasia 7")).toBeInTheDocument();

    dashboard = () => Promise.reject(new TypeError("Failed to fetch"));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS);
    });
    expect(screen.getByText("Total rahasia 7")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();

    dashboard = () => Promise.resolve(json(401, { code: "SESSION_EXPIRED" }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(POLL_MS);
    });
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login?reason=expired"));
    expect(screen.queryByText("Total rahasia 7")).not.toBeInTheDocument();
  });

  // Edge: after a 401 someone logs in again in the same tab, possibly a different person on a
  // shared laptop. /me answers quickly but the page data is still on its way. usePolledResource
  // keeps the last data on screen when a poll fails, so the only thing that removes old numbers
  // is the guard unmounting the page. If any layer kept that data across mounts (a module cache,
  // a stored snapshot), the previous login's numbers would show to the new login until the fresh
  // answer arrives.
  it("does not show the previous login's numbers while the new login's data is loading", async () => {
    routeFetch((path) =>
      path === "/me"
        ? Promise.resolve(json(200, ME))
        : Promise.resolve(json(200, { total: 7 })),
    );
    const first = render(<ProtectedPage />);
    expect(await screen.findByText("Total rahasia 7")).toBeInTheDocument();

    routeFetch(() => Promise.resolve(json(401, { code: "SESSION_EXPIRED" })));
    await apiFetch("/notifications/unread-count").catch(() => undefined);
    await waitFor(() => expect(screen.queryByText("Total rahasia 7")).not.toBeInTheDocument());
    first.unmount();

    // New login: /me answers for another user, the page data never arrives in this test.
    routeFetch((path) =>
      path === "/me"
        ? Promise.resolve(json(200, { ...ME, id: "u2", role: "viewer" }))
        : new Promise<Response>(() => undefined),
    );
    render(<ProtectedPage />);

    expect(await screen.findByText("memuat data")).toBeInTheDocument();
    expect(screen.queryByText("Total rahasia 7")).not.toBeInTheDocument();
  });

  // Edge: Back after logout re-mounts the protected layout in the same tab. AuthProvider lives
  // inside that layout, so it must start from "loading" and ask /me again, not reuse the
  // "authenticated" answer from before the logout. If it reused it, the page would render and
  // fetch data for an expired cookie until some call happened to fail.
  it("asks /me again on Back after logout and goes to login without showing the page", async () => {
    routeFetch((path) =>
      path === "/me"
        ? Promise.resolve(json(200, ME))
        : Promise.resolve(json(200, { total: 7 })),
    );
    const first = render(<ProtectedPage />);
    expect(await screen.findByText("Total rahasia 7")).toBeInTheDocument();
    routeFetch(() => Promise.resolve(json(401, { code: "SESSION_EXPIRED" })));
    await apiFetch("/notifications/unread-count").catch(() => undefined);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login?reason=expired"));
    first.unmount();
    replaceMock.mockReset();

    // Back: same tab, the cookie is expired.
    const meBefore = calls("/me");
    const dashboardBefore = calls("/dashboard");
    render(<ProtectedPage />);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login?reason=expired"));
    expect(screen.queryByText("Total rahasia 7")).not.toBeInTheDocument();
    expect(calls("/me")).toBe(meBefore + 1);
    expect(calls("/dashboard")).toBe(dashboardBefore);
  });
});
