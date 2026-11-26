import { render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ReportPreviewPage from "./page";

const params = vi.hoisted(() => ({ scenario: "first" }));
const notFound = vi.hoisted(() =>
  vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
);
vi.mock("next/navigation", () => ({ useParams: () => params, notFound }));

beforeEach(() => {
  params.scenario = "first";
  vi.stubEnv("NODE_ENV", "development");
});

afterEach(() => {
  vi.unstubAllEnvs();
  notFound.mockClear();
});

// SCRUM-322: until the SCRUM-320 endpoints exist, SA, PO and usability testers look at the report page with the
// shared synthetic fixtures. The page exists only in development and never shows real data (L3).
describe("ReportPreviewPage (development only)", () => {
  it("renders the first report scenario with a synthetic-data notice", () => {
    render(<ReportPreviewPage />);

    expect(screen.getByRole("article")).toHaveAttribute("lang", "en");
    expect(screen.getByRole("heading", { level: 1, name: "Perbandingan 5 produk, Oktober 2026" })).toBeInTheDocument();
    expect(screen.getByText(/data contoh sintetis/)).toBeInTheDocument();
  });

  it.each([
    ["first-id", "id", 1],
    ["dev-test", "id", 3],
  ])("renders the %s scenario in %s with %s section(s)", (scenario, language, sections) => {
    params.scenario = scenario;
    render(<ReportPreviewPage />);

    expect(screen.getByRole("article")).toHaveAttribute("lang", language);
    expect(screen.getAllByRole("table")).toHaveLength(sections);
  });

  it("renders a report without results for the empty scenario", () => {
    params.scenario = "empty";
    render(<ReportPreviewPage />);
    expect(screen.getByText("Tidak ada hasil untuk laporan ini.")).toBeInTheDocument();
  });

  it("links every scenario so testers can switch between them", () => {
    render(<ReportPreviewPage />);
    const nav = screen.getByRole("navigation", { name: "Skenario pratinjau" });
    expect(within(nav).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual([
      "/reports/comparisons/preview/first",
      "/reports/comparisons/preview/first-id",
      "/reports/comparisons/preview/dev-test",
      "/reports/comparisons/preview/empty",
    ]);
  });

  it("answers 404 for a scenario it does not know", () => {
    params.scenario = "real-data";
    expect(() => render(<ReportPreviewPage />)).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalled();
  });

  // Security: never reachable in a production or test build, even for a valid scenario.
  it.each(["production", "test"])("answers 404 when NODE_ENV is %s", (env) => {
    vi.stubEnv("NODE_ENV", env);
    expect(() => render(<ReportPreviewPage />)).toThrow("NEXT_NOT_FOUND");
  });
});
