import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AiMonitoringPage from "./page";
import type { Role } from "@/types";

const { useAuthMock, replaceMock, apiFetchMock, locationReplace } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  replaceMock: vi.fn(),
  apiFetchMock: vi.fn(),
  locationReplace: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: vi.fn() }),
}));
vi.mock("@/lib/apiClient", () => ({ apiFetch: apiFetchMock }));

describe("AiMonitoringPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("location", { replace: locationReplace });
  });

  function setAuth(role: Role | null, status: "loading" | "authenticated" = "authenticated") {
    if (status === "loading" || role === null) {
      useAuthMock.mockReturnValue({ status: "loading" });
    } else {
      useAuthMock.mockReturnValue({
        status: "authenticated",
        user: { id: "user-1", name: "User Test", email: "user@veritask.ai", role },
      });
    }
  }

  it("shows loading while the session is loading", () => {
    setAuth(null, "loading");
    render(<AiMonitoringPage />);
    expect(screen.getByText("Memuat…")).toBeInTheDocument();
  });

  it.each(["admin", "developer_ai"] as const)(
    "shows the local Langfuse UI for %s on this site",
    async (role) => {
      setAuth(role);
      apiFetchMock.mockResolvedValue({
        url: "javascript:alert(1)",
        reachable: true,
      });
      render(<AiMonitoringPage />);
      const frame = await screen.findByTitle("Pemantauan AI");
      expect(frame).toHaveAttribute("src", "/ai-monitoring/view/");
      expect(locationReplace).not.toHaveBeenCalled();
      expect(replaceMock).not.toHaveBeenCalled();
    },
  );

  it("says the local UI is down and does not open another host", async () => {
    setAuth("admin");
    apiFetchMock.mockResolvedValue({ url: "https://cloud.langfuse.com", reachable: false });
    render(<AiMonitoringPage />);
    expect(await screen.findByText("Antarmuka Langfuse lokal tidak terjangkau.")).toBeInTheDocument();
    expect(screen.queryByTitle("Pemantauan AI")).not.toBeInTheDocument();
    expect(locationReplace).not.toHaveBeenCalled();
  });

  it.each(["contributor", "viewer"] as const)("sends %s to forbidden", (role) => {
    setAuth(role);
    render(<AiMonitoringPage />);
    expect(replaceMock).toHaveBeenCalledWith("/forbidden");
    expect(apiFetchMock).not.toHaveBeenCalled();
  });
});
