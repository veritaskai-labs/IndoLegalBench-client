import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewMeasurementPage from "./page";
import { ToastProvider } from "@/components/ui/Toast";
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

// Mock the child form to isolate page-level tests
vi.mock("@/components/measurements/CreateMeasurementForm", () => ({
  CreateMeasurementForm: () => (
    <div data-testid="mock-create-measurement-form">Form Mock</div>
  ),
}));

describe("NewMeasurementPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  function renderPage() {
    return render(
      <ToastProvider>
        <NewMeasurementPage />
      </ToastProvider>,
    );
  }

  it("shows loading state when unauthenticated or session is loading", () => {
    setAuth(null, "loading");
    renderPage();

    expect(screen.getByText("Memuat…")).toBeInTheDocument();
    expect(
      screen.queryByTestId("mock-create-measurement-form"),
    ).not.toBeInTheDocument();
  });

  it("allows Admin to access the page and renders header and form", () => {
    setAuth("admin");
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Buat Pengukuran Otomatis", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("mock-create-measurement-form")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("allows Developer AI (developer_ai) to access the page (AC1, D10)", () => {
    setAuth("developer_ai");
    renderPage();

    expect(
      screen.getByRole("heading", { name: "Buat Pengukuran Otomatis", level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByTestId("mock-create-measurement-form")).toBeInTheDocument();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("redirects Contributor to /forbidden", () => {
    setAuth("contributor");
    renderPage();

    expect(replaceMock).toHaveBeenCalledWith("/forbidden");
    expect(
      screen.queryByTestId("mock-create-measurement-form"),
    ).not.toBeInTheDocument();
  });

  it("redirects Viewer to /forbidden", () => {
    setAuth("viewer");
    renderPage();

    expect(replaceMock).toHaveBeenCalledWith("/forbidden");
    expect(
      screen.queryByTestId("mock-create-measurement-form"),
    ).not.toBeInTheDocument();
  });

  it("navigates to /runs when Eksekusi breadcrumb is clicked", async () => {
    setAuth("admin");
    const user = userEvent.setup();
    renderPage();

    const breadcrumbLink = screen.getByRole("button", { name: "Eksekusi" });
    await user.click(breadcrumbLink);

    expect(pushMock).toHaveBeenCalledWith("/runs");
  });
});
