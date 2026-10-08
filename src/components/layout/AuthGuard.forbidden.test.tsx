import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  user: { id: "u1", name: "Uji Author", email: "author@veritask.test", role: "author" },
} as const;

import { apiFetch } from "@/lib/apiClient";
import { AuthGuard } from "./AuthGuard";

function forbiddenResponse() {
  return {
    ok: false,
    status: 403,
    json: () => Promise.resolve({ code: "FORBIDDEN", message: "..." }),
  } as unknown as Response;
}

beforeEach(() => {
  replaceMock.mockReset();
  useAuthMock.mockReset().mockReturnValue(AUTHENTICATED);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(forbiddenResponse()));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("AuthGuard 403 handling", () => {
  it("redirects to /forbidden when an API call returns 403", async () => {
    render(
      <AuthGuard>
        <p>protected content</p>
      </AuthGuard>,
    );

    await expect(apiFetch("/admin/users")).rejects.toMatchObject({ status: 403 });
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/forbidden"));
  });

  it("stops listening for 403 after it unmounts", async () => {
    const { unmount } = render(
      <AuthGuard>
        <p>protected content</p>
      </AuthGuard>,
    );
    unmount();

    await expect(apiFetch("/admin/users")).rejects.toMatchObject({ status: 403 });
    expect(replaceMock).not.toHaveBeenCalledWith("/forbidden");
  });

  // Review Esi di PR #13: 403 selama /me belum selesai tidak boleh berebut dengan
  // redirect ke /login. Listener baru aktif setelah sesi dikenali.
  it("does not send the user to /forbidden while the session is still loading", async () => {
    useAuthMock.mockReturnValue({ status: "loading" });
    render(
      <AuthGuard>
        <p>protected content</p>
      </AuthGuard>,
    );

    await expect(apiFetch("/me")).rejects.toMatchObject({ status: 403 });
    expect(replaceMock).not.toHaveBeenCalledWith("/forbidden");
  });

  it("only sends an unauthenticated user to /login, never to /forbidden", async () => {
    useAuthMock.mockReturnValue({ status: "unauthenticated", reason: "no_session" });
    render(
      <AuthGuard>
        <p>protected content</p>
      </AuthGuard>,
    );

    await expect(apiFetch("/me")).rejects.toMatchObject({ status: 403 });
    expect(replaceMock).toHaveBeenCalledWith("/login");
    expect(replaceMock).not.toHaveBeenCalledWith("/forbidden");
  });

  it("starts listening for 403 once the session is known", async () => {
    useAuthMock.mockReturnValue({ status: "loading" });
    const { rerender } = render(
      <AuthGuard>
        <p>protected content</p>
      </AuthGuard>,
    );
    useAuthMock.mockReturnValue(AUTHENTICATED);
    rerender(
      <AuthGuard>
        <p>protected content</p>
      </AuthGuard>,
    );

    await expect(apiFetch("/admin/users")).rejects.toMatchObject({ status: 403 });
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/forbidden"));
  });
});
