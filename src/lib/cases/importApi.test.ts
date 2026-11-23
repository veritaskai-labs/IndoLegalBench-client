import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, BASE_URL } from "@/lib/apiClient";
import { TEMPLATE_FILE_NAME, importGateway } from "./importApi";

/**
 * Isolation: vi.stubGlobal("fetch") with real Response objects, so the real apiFetchBlob runs (URL,
 * credentials, error parsing, 403 handling) and only the network is replaced.
 */
const fetchMock = vi.fn();

const TEMPLATE = "﻿title,question,category,split_tag,legal_refs,must_contain,must_not_contain,expected_conclusion\r\n";

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe("importGateway.downloadTemplate (AC6)", () => {
  // Positive: the file comes from the server as is.
  it("gets the template with the session cookie and returns the file", async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      new Response(TEMPLATE, {
        status: 200,
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="template-impor-kasus.csv"',
        },
      }),
    );

    // Act
    const file = await importGateway.downloadTemplate();

    // Assert
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/case-imports/template`);
    expect(init.credentials).toBe("include");
    expect(init.method ?? "GET").toBe("GET");
    expect(await file.text()).toBe(TEMPLATE);
  });

  // Negative: a role the server refuses reaches the caller as an ApiError with its code.
  it("passes the 403 of the server on as an ApiError", async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "FORBIDDEN", message: "Akses ditolak" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    // Act
    const call = importGateway.downloadTemplate();

    // Assert
    await expect(call).rejects.toBeInstanceOf(ApiError);
    await expect(call).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });

  // Negative: the network is down.
  it("passes a network failure on unchanged", async () => {
    // Arrange
    const failure = new TypeError("Failed to fetch");
    fetchMock.mockRejectedValue(failure);

    // Act / Assert
    await expect(importGateway.downloadTemplate()).rejects.toBe(failure);
  });
});

describe("TEMPLATE_FILE_NAME", () => {
  // Edge: the API is cross-origin and Content-Disposition is not an exposed CORS header, so the browser
  // hides the server's file name from JS. The name is kept equal to server import_router.TEMPLATE_FILE_NAME.
  it("matches the file name the server sends", () => {
    // Arrange / Act / Assert
    expect(TEMPLATE_FILE_NAME).toBe("template-impor-kasus.csv");
  });
});
