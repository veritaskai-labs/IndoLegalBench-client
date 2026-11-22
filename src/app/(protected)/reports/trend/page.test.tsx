import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import TrendPage, { metadata } from "./page";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ status: "authenticated", user: { id: "u-1", name: "Admin", email: "a@x.test", role: "admin" } }),
}));
// The page has its own tests with fake gateways; here only the route matters.
vi.mock("@/lib/reports/reportsApi", () => ({
  httpReportsGateway: { eligibleSessions: vi.fn(() => new Promise(() => undefined)) },
}));
vi.mock("@/lib/reports/trend/trendApi", () => ({
  httpTrendGateway: { get: vi.fn(() => new Promise(() => undefined)), pdf: vi.fn() },
}));

// SCRUM-334: the trend page has its own address, /reports/trend.
describe("TrendPage", () => {
  it("names the browser tab after the page", () => {
    expect(metadata.title).toBe("Tren kualitas | IndoLegalBench");
  });

  it("renders the trend page", () => {
    render(<TrendPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Tren kualitas produk" })).toBeInTheDocument();
  });
});
