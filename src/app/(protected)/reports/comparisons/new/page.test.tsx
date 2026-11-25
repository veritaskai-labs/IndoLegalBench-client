import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import NewReportPage, { metadata } from "./page";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ status: "authenticated", user: { id: "u-1", name: "Admin", email: "a@x.test", role: "admin" } }),
}));
// The form has its own tests with a fake gateway; here only the route matters.
vi.mock("@/lib/reports/reportsApi", () => ({
  httpReportsGateway: { eligibleSessions: vi.fn(() => new Promise(() => {})), create: vi.fn() },
}));

// SCRUM-321: the report builder has its own address next to Kak Nizar's list, /reports/comparisons/new.
describe("NewReportPage", () => {
  it("names the browser tab after the page", () => {
    expect(metadata.title).toBe("Buat laporan perbandingan | IndoLegalBench");
  });

  it("renders the builder", () => {
    render(<NewReportPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Buat laporan perbandingan" })).toBeInTheDocument();
  });
});
