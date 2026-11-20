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

function publications(from: number, count: number): PublishedReportListItem[] {
  return Array.from({ length: count }, (_, index) => ({ ...listed, id: `pub-${from + index}`, report_id: `r-${from + index}` }));
}

describe("httpPublicationGateway.listPublished (GET /published-reports, AC9)", () => {
  it("reads the current publications, newest first as the server sends them", async () => {
    fetchMock.mockResolvedValue(fakeResponse(200, { items: [listed], total: 1, page: 1, size: 100 }));

    await expect(httpPublicationGateway.listPublished()).resolves.toEqual([listed]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/published-reports\?page=1&size=100$/);
    expect(init).toMatchObject({ credentials: "include" });
  });

  // Review PR #106 blocker 1: the server caps a page at 100, so the 101st publication must not drop out of the
  // list or out of the replacement choice.
  it("follows every page until it has all current publications", async () => {
    fetchMock
      .mockResolvedValueOnce(fakeResponse(200, { items: publications(1, 100), total: 101, page: 1, size: 100 }))
      .mockResolvedValueOnce(fakeResponse(200, { items: publications(101, 1), total: 101, page: 2, size: 100 }));

    const all = await httpPublicationGateway.listPublished();

    expect(all).toHaveLength(101);
    expect(all.at(-1)?.id).toBe("pub-101");
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      expect.stringMatching(/\/published-reports\?page=1&size=100$/),
      expect.stringMatching(/\/published-reports\?page=2&size=100$/),
    ]);
  });

  it("stops on an empty page even if the total says more, so a shrinking list cannot loop", async () => {
    fetchMock
      .mockResolvedValueOnce(fakeResponse(200, { items: publications(1, 100), total: 150, page: 1, size: 100 }))
      .mockResolvedValueOnce(fakeResponse(200, { items: [], total: 100, page: 2, size: 100 }));

    await expect(httpPublicationGateway.listPublished()).resolves.toHaveLength(100);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
