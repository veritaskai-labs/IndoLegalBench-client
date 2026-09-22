import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "@/lib/apiClient";
import type { Me } from "@/types";
import { AuthProvider, useAuth } from "./useAuth";

vi.mock("@/lib/apiClient", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/apiClient")>()),
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

const user: Me = {
  id: "11111111-1111-1111-1111-111111111111",
  name: "Rina Hapsari",
  email: "rina@veritask.id",
  role: "author",
};

/** Tampilkan state auth sebagai teks supaya gampang dicek */
function Probe() {
  const auth = useAuth();
  if (auth.status === "authenticated") {
    return <p>{`authenticated:${auth.user.name}`}</p>;
  }
  if (auth.status === "unauthenticated") {
    return <p>{`unauthenticated:${auth.reason}`}</p>;
  }
  return <p>loading</p>;
}

function renderWithProvider() {
  return render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );
}

beforeEach(() => {
  apiFetchMock.mockReset();
});

describe("AuthProvider", () => {
  it("starts in loading while /me is pending", () => {
    apiFetchMock.mockReturnValue(new Promise(() => {}));

    renderWithProvider();

    expect(screen.getByText("loading")).toBeInTheDocument();
    expect(apiFetchMock).toHaveBeenCalledWith("/me");
  });

  it("becomes authenticated when /me returns a user", async () => {
    apiFetchMock.mockResolvedValue(user);

    renderWithProvider();

    expect(
      await screen.findByText("authenticated:Rina Hapsari"),
    ).toBeInTheDocument();
  });

  it("marks the session as expired on SESSION_EXPIRED", async () => {
    apiFetchMock.mockRejectedValue(new ApiError(401, "SESSION_EXPIRED"));

    renderWithProvider();

    expect(
      await screen.findByText("unauthenticated:expired"),
    ).toBeInTheDocument();
  });

  it("treats UNAUTHENTICATED as no session", async () => {
    apiFetchMock.mockRejectedValue(new ApiError(401, "UNAUTHENTICATED"));

    renderWithProvider();

    expect(
      await screen.findByText("unauthenticated:no_session"),
    ).toBeInTheDocument();
  });

  it("treats a network failure as no session", async () => {
    apiFetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    renderWithProvider();

    expect(
      await screen.findByText("unauthenticated:no_session"),
    ).toBeInTheDocument();
  });
});

describe("useAuth", () => {
  it("reports loading outside AuthProvider", () => {
    render(<Probe />);

    expect(screen.getByText("loading")).toBeInTheDocument();
  });
});