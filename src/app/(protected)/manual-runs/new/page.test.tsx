import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewManualMeasurementPage from "./page";
import type { Role } from "@/types";

const { useAuthMock, replaceMock, pushMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  replaceMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: pushMock }),
}));

vi.mock("@/components/manual-runs/CreateManualSessionForm", () => ({
  CreateManualSessionForm: () => (
    <div data-testid="mock-create-manual-session-form">Form Mock</div>
  ),
}));

function signedInAs(role: Role | null, status: "loading" | "authenticated" = "authenticated") {
  if (status === "loading" || role === null) {
    useAuthMock.mockReturnValue({ status: "loading" });
  } else {
    useAuthMock.mockReturnValue({
      status: "authenticated",
      user: { id: "user-1", name: "User Test", email: "user@veritask.ai", role },
    });
  }
}

describe("NewManualMeasurementPage (PBI-22 AC1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows loading state when authentication is loading", () => {
    signedInAs(null, "loading");
    render(<NewManualMeasurementPage />);

    expect(screen.getByText("Memuat…")).toBeInTheDocument();
  });

  it("redirects non-admin roles (contributor, developer_ai, viewer) to /forbidden", () => {
    signedInAs("contributor");
    render(<NewManualMeasurementPage />);

    expect(replaceMock).toHaveBeenCalledWith("/forbidden");
    expect(
      screen.queryByTestId("mock-create-manual-session-form"),
    ).not.toBeInTheDocument();
  });

  it("allows Admin to access and renders header, breadcrumbs, and form", async () => {
    const user = userEvent.setup();
    signedInAs("admin");

    render(<NewManualMeasurementPage />);

    expect(
      screen.getByRole("heading", { name: "Buat Pengukuran Manual" }),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("mock-create-manual-session-form"),
    ).toBeInTheDocument();

    const breadcrumbLink = screen.getByRole("button", { name: "Pengukuran Manual" });
    await user.click(breadcrumbLink);
    expect(pushMock).toHaveBeenCalledWith("/manual-runs");
  });
});
