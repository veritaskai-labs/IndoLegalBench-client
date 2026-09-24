import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSuites } from "@/hooks/useSuites";
import SuitesPage from "./page";

const { useSuitesMock } = vi.hoisted(() => ({ useSuitesMock: vi.fn() }));

vi.mock("@/hooks/useSuites", () => ({ useSuites: useSuitesMock }));

beforeEach(() => {
  useSuitesMock.mockReset();
  useSuitesMock.mockReturnValue({
    status: "ready",
    suites: [],
    reload: vi.fn(),
  });
});

describe("SuitesPage", () => {
  it("asks for the active suites first", () => {
    render(<SuitesPage />);

    expect(useSuites).toHaveBeenCalledWith("active");
  });

  it("marks the Aktif tab as selected on load", () => {
    render(<SuitesPage />);

    expect(screen.getByRole("tab", { name: "Aktif" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "Arsip" })).toHaveAttribute(
      "aria-selected",
      "false",
    );
  });

  it("switches to the archived suites when the Arsip tab is clicked", async () => {
    const user = userEvent.setup();

    render(<SuitesPage />);
    await user.click(screen.getByRole("tab", { name: "Arsip" }));

    expect(useSuites).toHaveBeenLastCalledWith("archived");
    expect(screen.getByRole("tab", { name: "Arsip" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("shows the create button", () => {
    render(<SuitesPage />);

    expect(
      screen.getByRole("button", { name: "Buat Suite" }),
    ).toBeInTheDocument();
  });

  it("shows the suites it gets from the hook", () => {
    useSuitesMock.mockReturnValue({
      status: "ready",
      reload: vi.fn(),
      suites: [
        {
          id: "11111111-1111-1111-1111-111111111111",
          name: "Perburuhan",
          description: "Kasus hukum ketenagakerjaan",
          status: "active",
          case_count: 3,
          is_empty: false,
          exportable: true,
          created_at: "2026-09-01T00:00:00Z",
          updated_at: "2026-09-01T00:00:00Z",
        },
      ],
    });

    render(<SuitesPage />);

    expect(screen.getByText("Perburuhan")).toBeInTheDocument();
  });
});