import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock }),
}));

import { AuthDoneHandler } from "./AuthDoneHandler";

function mockFetchOnce(response: { ok: boolean; status?: number; body: unknown }) {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: async () => response.body,
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  replaceMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("AuthDoneHandler", () => {
  it("shows a loading state on first render", () => {
    mockFetchOnce({ ok: true, body: { role: "author" } });
    render(<AuthDoneHandler />);
    expect(screen.getByText("Memproses login Anda...")).toBeInTheDocument();
  });

    it("shows a generic failure for an unrecognized non-401 error response", async () => {
    mockFetchOnce({ ok: false, status: 500, body: {} });
    render(<AuthDoneHandler />);
    await waitFor(() =>
      expect(screen.getByText("Gagal memproses login")).toBeInTheDocument(),
    );
  });

  it("redirects to the role's home path on a successful profile fetch", async () => {
    mockFetchOnce({ ok: true, body: { role: "author" } });
    render(<AuthDoneHandler />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/suites"));
  });

  it("shows a generic failure when the role is missing or unknown", async () => {
    mockFetchOnce({ ok: true, body: { role: "not-a-real-role" } });
    render(<AuthDoneHandler />);
    await waitFor(() =>
      expect(screen.getByText("Gagal memproses login")).toBeInTheDocument(),
    );
  });

  it("shows a generic failure when /me returns 403 (account-status codes arrive via query param, not from /me)", async () => {
    mockFetchOnce({ ok: false, status: 403, body: { code: "USER_NOT_REGISTERED" } });
    render(<AuthDoneHandler />);
    await waitFor(() =>
      expect(screen.getByText("Gagal memproses login")).toBeInTheDocument(),
    );
  });

  it("redirects to /login on a plain 401", async () => {
    mockFetchOnce({ ok: false, status: 401, body: {} });
    render(<AuthDoneHandler />);
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/login"));
  });

  it("redirects to /login?reason=expired when the session expired", async () => {
    mockFetchOnce({ ok: false, status: 401, body: { code: "SESSION_EXPIRED" } });
    render(<AuthDoneHandler />);
    await waitFor(() =>
      expect(replaceMock).toHaveBeenCalledWith("/login?reason=expired"),
    );
  });

  it("shows a retry button when the fetch throws", async () => {
    global.fetch = vi.fn().mockRejectedValueOnce(new Error("network down"));
    render(<AuthDoneHandler />);
    await waitFor(() =>
      expect(screen.getByText("Gagal memproses login")).toBeInTheDocument(),
    );
    expect(screen.getByRole("button", { name: "Coba lagi" })).toBeInTheDocument();
  });

  it("retries the fetch when the retry button is clicked", async () => {
    global.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error("network down"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ role: "admin" }),
      });
    const user = userEvent.setup();
    render(<AuthDoneHandler />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Coba lagi" })).toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith("/admin/users"));
  });

  it("renders the auth-error screen directly when initialErrorCode is provided, without fetching", () => {
    const fetchSpy = vi.fn();
    global.fetch = fetchSpy as unknown as typeof fetch;
    render(<AuthDoneHandler initialErrorCode="USER_DEACTIVATED" />);
    expect(screen.getByText("Akun Anda telah dinonaktifkan")).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});