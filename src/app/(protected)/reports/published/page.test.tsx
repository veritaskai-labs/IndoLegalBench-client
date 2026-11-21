import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { httpPublicationGateway } from "@/lib/reports/publicationApi";

import PublishedReportsPage, { metadata } from "./page";

// publicationApi has its own request tests (stubbed fetch); here only the page's reaction matters.
vi.mock("@/lib/reports/publicationApi", () => ({
  httpPublicationGateway: { publish: vi.fn(), listPublished: vi.fn() },
}));

const listPublished = vi.mocked(httpPublicationGateway.listPublished);

beforeEach(() => {
  listPublished.mockReset();
  listPublished.mockResolvedValue([]);
});

// SCRUM-335 (AC9): the published list has its own address, /reports/published.
describe("PublishedReportsPage", () => {
  it("names the browser tab after the page", () => {
    expect(metadata.title).toBe("Laporan terbit | IndoLegalBench");
  });

  it("shows the published list read from the server", async () => {
    render(<PublishedReportsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Laporan terbit" })).toBeInTheDocument();
    expect(await screen.findByText("Belum ada laporan terbit")).toBeInTheDocument();
    expect(listPublished).toHaveBeenCalledTimes(1);
  });
});
