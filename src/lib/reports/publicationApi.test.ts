import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, onForbidden } from "@/lib/apiClient";
import type { PublicationRead, PublishedReportListItem } from "@/types/reports";

import { httpPublicationGateway } from "./publicationApi";

// The real apiFetch runs against a stubbed fetch, so the test proves what reaches the wire (server PR #151).
function fakeResponse(status: number, body?: unknown) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new SyntaxError("no body")) : Promise.resolve(body)),
  } as unknown as Response;
}

const fetchMock = vi.fn();
const unsubscribers: Array<() => void> = [];

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  while (unsubscribers.length > 0) unsubscribers.pop()?.();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

const publication: PublicationRead = { id: "pub-2", report_id: "r-2", version_no: 2, supersedes_id: "pub-1" };

const listed: PublishedReportListItem = {
  id: "pub-1",
  report_id: "r-1",
  version_no: 1,
  title: "Perbandingan Oktober",
  published_at: "2026-11-18T03:00:00Z",
  published_by: "admin-1",
  product_labels: ["AiYU", "Produk B"],
};

describe("httpPublicationGateway.publish (POST /reports/{id}/publish, AC9)", () => {
  it("publishes a saved report as a new publication with an empty body", async () => {
    fetchMock.mockResolvedValue(fakeResponse(201, { ...publication, version_no: 1, supersedes_id: null }));

    await httpPublicationGateway.publish("r-2");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/reports\/r-2\/publish$/);
    expect(init).toMatchObject({ method: "POST", credentials: "include" });
    expect(JSON.parse(init.body)).toEqual({});
  });

  it("replaces a current publication by sending its id, and returns the new version", async () => {
    fetchMock.mockResolvedValue(fakeResponse(201, publication));

    await expect(httpPublicationGateway.publish("r-2", "pub-1")).resolves.toEqual(publication);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ supersedes_id: "pub-1" });
  });

  it("escapes the report id in the path", async () => {
    fetchMock.mockResolvedValue(fakeResponse(201, publication));

    await httpPublicationGateway.publish("a/b");

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/reports\/a%2Fb\/publish$/);
  });

  // AC12: the refusal reaches the dialog with its code, so it can explain it.
  it("hands the dev score refusal over as an ApiError with its code", async () => {
    fetchMock.mockResolvedValue(fakeResponse(409, { code: "REPORT_HAS_DEV_SCORES", message: "..." }));

    await expect(httpPublicationGateway.publish("r-3")).rejects.toMatchObject({
      status: 409,
      code: "REPORT_HAS_DEV_SCORES",
    });
  });

  it("keeps a 403 on the page instead of jumping to /forbidden", async () => {
    const listener = vi.fn();
    unsubscribers.push(onForbidden(listener));
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "FORBIDDEN" }));

    await expect(httpPublicationGateway.publish("r-2")).rejects.toBeInstanceOf(ApiError);
    expect(listener).not.toHaveBeenCalled();
  });
});

describe("httpPublicationGateway.listPublished (GET /published-reports, AC9)", () => {
  it("reads the current publications, newest first as the server sends them", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, { items: [listed], total: 1, page: 1, size: 100 }));

    await expect(httpPublicationGateway.listPublished()).resolves.toEqual([listed]);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/published-reports\?size=100$/);
    expect(init).toMatchObject({ credentials: "include" });
  });
});
