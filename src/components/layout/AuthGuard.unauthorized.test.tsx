import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// SCRUM-252: a 401 from any API call on a protected page clears the protected screen at once
// and sends the user to login. Before this, the dashboard kept its last numbers on screen after
// the session was gone, until the user clicked something.

const { replaceMock, useAuthMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));

const AUTHENTICATED = {
  status: "authenticated",
  user: { id: "u1", name: "Uji Admin", email: "admin@veritask.test", role: "admin" },
} as const;

import { apiFetch } from "@/lib/apiClient";
import { AuthGuard } from "./AuthGuard";

function response(status: number, code?: string) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () =>
      code === undefined ? Promise.reject(new SyntaxError("no body")) : Promise.resolve({ code }),
  } as unknown as Response;
}

const fetchMock = vi.fn();

function renderGuard() {
  return render(
    <AuthGuard>
      <p>protected content</p>
    </AuthGuard>,
  );
}

beforeEach(() => {
  replaceMock.mockReset();
  useAuthMock.mockReset().mockReturnValue(AUTHENTICATED);
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("AuthGuard 401 handling", () => {
  // Positive: idle or absolute cap passed while the page was open.
  it("clears the protected screen and sends an expired session to /login?reason=expired", async () => {
    renderGuard();
    fetchMock.mockResolvedValue(response(401, "SESSION_EXPIRED"));

    await expect(apiFetch("/dashboard")).rejects.toMatchObject({ status: 401 });

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login?reason=expired"));
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  // Positive: session deleted (logged out in another tab, account deactivated).
  it("sends a missing session to /login without a reason", async () => {
    renderGuard();
    fetchMock.mockResolvedValue(response(401, "UNAUTHENTICATED"));

    await apiFetch("/notifications/unread-count").catch(() => undefined);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
    expect(screen.queryByText("protected content")).not.toBeInTheDocument();
  });

  // Edge: the unread-count poll and the dashboard poll can fail in the same tick.
  it("redirects once when several calls fail with 401 together", async () => {
    renderGuard();
    fetchMock.mockResolvedValue(response(401, "SESSION_EXPIRED"));

    await Promise.all([
      apiFetch("/dashboard").catch(() => undefined),
      apiFetch("/notifications/unread-count").catch(() => undefined),
    ]);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledTimes(1));
  });

  // Edge: the first reason wins, so a later UNAUTHENTICATED does not drop the "expired" message.
  it("keeps the first reason when a different 401 follows", async () => {
    renderGuard();
    fetchMock.mockResolvedValueOnce(response(401, "SESSION_EXPIRED"));
    fetchMock.mockResolvedValueOnce(response(401, "UNAUTHENTICATED"));

    await apiFetch("/dashboard").catch(() => undefined);
    await apiFetch("/notifications/unread-count").catch(() => undefined);

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login?reason=expired"));
    expect(replaceMock).not.toHaveBeenCalledWith("/login");
  });

  // Negative: other errors are handled by the page; the screen stays.
  it("leaves the screen alone on a 500", async () => {
    renderGuard();
    fetchMock.mockResolvedValue(response(500, "INTERNAL"));

    await apiFetch("/dashboard").catch(() => undefined);

    expect(screen.getByText("protected content")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  // Negative: while /me is loading, the AuthProvider decides; no second redirect races it.
  it("does not react to a 401 while the session is still loading", async () => {
    useAuthMock.mockReturnValue({ status: "loading" });
    renderGuard();
    fetchMock.mockResolvedValue(response(401, "SESSION_EXPIRED"));

    await apiFetch("/me").catch(() => undefined);

    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("stops listening after it unmounts", async () => {
    const { unmount } = renderGuard();
    unmount();
    fetchMock.mockResolvedValue(response(401, "SESSION_EXPIRED"));

    await apiFetch("/dashboard").catch(() => undefined);

    expect(replaceMock).not.toHaveBeenCalled();
  });
});
