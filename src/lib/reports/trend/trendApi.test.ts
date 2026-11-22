import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError, onForbidden } from "@/lib/apiClient";
import { trendRead } from "@/test/trendFixtures";

import { httpTrendGateway, type TrendQuery } from "./trendApi";

// The real apiFetch runs against a stubbed fetch, so the test proves what reaches the wire and that a 403 stays
// on the page (silentForbidden) instead of jumping to /forbidden: the trend page explains it itself.
function fakeResponse(status: number, body?: unknown, blob?: Blob) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => (body === undefined ? Promise.reject(new SyntaxError("no body")) : Promise.resolve(body)),
    blob: () => Promise.resolve(blob ?? new Blob()),
  } as unknown as Response;
}

const fetchMock = vi.fn();
const unsubscribers: Array<() => void> = [];

const QUERY: TrendQuery = {
  productId: "11111111-1111-4111-8111-111111111111",
  scope: "test",
  metric: "total",
  range: "all",
};

function listenForbidden() {
  const listener = vi.fn();
  unsubscribers.push(onForbidden(listener));
  return listener;
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  while (unsubscribers.length > 0) unsubscribers.pop()?.();
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("httpTrendGateway.get (GET /reports/trend)", () => {
  // Positive
  it("sends the product and every filter as query parameters with the session cookie", async () => {
    // Arrange
    const read = trendRead({ metric: "llm", range: "6m" });
    fetchMock.mockResolvedValue(fakeResponse(200, read));

    // Act
    const result = await httpTrendGateway.get({ ...QUERY, scope: "dev_test", metric: "llm", range: "6m" });

    // Assert
    expect(result).toEqual(read);
    const [url, init] = fetchMock.mock.calls[0];
    const parsed = new URL(url as string);
    expect(parsed.pathname).toBe("/reports/trend");
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      product_id: QUERY.productId,
      score_scope: "dev_test",
      metric: "llm",
      range: "6m",
    });
    expect(init).toMatchObject({ credentials: "include" });
  });

  // Negative
  it("keeps a 403 TREND_SCOPE_FORBIDDEN on the page instead of redirecting to /forbidden", async () => {
    // Arrange
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(
      fakeResponse(403, { code: "TREND_SCOPE_FORBIDDEN", message: "Peran Anda hanya boleh melihat tren skor test." }),
    );

    // Act
    const failure = await httpTrendGateway.get({ ...QUERY, scope: "dev" }).catch((error: unknown) => error);

    // Assert
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 403, code: "TREND_SCOPE_FORBIDDEN" });
    expect(forbidden).not.toHaveBeenCalled();
  });

  // Negative
  it("rejects with the server status when the product does not exist", async () => {
    // Arrange
    fetchMock.mockResolvedValue(fakeResponse(404, { code: "PRODUCT_NOT_FOUND", message: "Produk tidak ditemukan." }));

    // Act
    const failure = await httpTrendGateway.get(QUERY).catch((error: unknown) => error);

    // Assert
    expect(failure).toMatchObject({ status: 404, code: "PRODUCT_NOT_FOUND" });
  });
});

describe("httpTrendGateway.pdf (GET /reports/trend/pdf)", () => {
  // Positive
  it("asks for the PDF with the same filters as the chart and hands back the file", async () => {
    // Arrange
    const file = new Blob(["%PDF-1.7"], { type: "application/pdf" });
    fetchMock.mockResolvedValue(fakeResponse(200, undefined, file));

    // Act
    const result = await httpTrendGateway.pdf({ ...QUERY, metric: "deterministic", range: "12m" });

    // Assert
    expect(result).toBe(file);
    const [url, init] = fetchMock.mock.calls[0];
    const parsed = new URL(url as string);
    expect(parsed.pathname).toBe("/reports/trend/pdf");
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      product_id: QUERY.productId,
      score_scope: "test",
      metric: "deterministic",
      range: "12m",
    });
    expect(init).toMatchObject({ credentials: "include" });
  });

  // Negative
  it("keeps a 403 on the page and rejects with the server code", async () => {
    // Arrange
    const forbidden = listenForbidden();
    fetchMock.mockResolvedValue(fakeResponse(403, { code: "TREND_SCOPE_FORBIDDEN" }));

    // Act
    const failure = await httpTrendGateway.pdf({ ...QUERY, scope: "dev_test" }).catch((error: unknown) => error);

    // Assert
    expect(failure).toMatchObject({ status: 403, code: "TREND_SCOPE_FORBIDDEN" });
    expect(forbidden).not.toHaveBeenCalled();
  });
});
