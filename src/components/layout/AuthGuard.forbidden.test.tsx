import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { replaceMock } = vi.hoisted(() => ({ replaceMock: vi.fn() }));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    status: "authenticated",
    user: { id: "u1", name: "Uji Author", email: "author@veritask.test", role: "author" },
  }),
}));

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
});