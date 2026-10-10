import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, BASE_URL } from "@/lib/apiClient";
import { compareCaseVersions, listCaseVersions, startCaseVersion } from "./versionApi";

const CASE_ID = "11111111-1111-1111-1111-111111111111";

// fetch is the only way out of this module, so stubbing it lets us check
// the exact request without a server.
const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startCaseVersion", () => {
  // Positive
  it("posts without a body to the case's versions endpoint and returns the new draft", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(201, { id: CASE_ID, status: "draft", version: 2 }));

    // Act
    const draft = await startCaseVersion(CASE_ID);

    // Assert
    expect(draft).toEqual({ id: CASE_ID, status: "draft", version: 2 });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/cases/${CASE_ID}/versions`);
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(init?.body).toBeUndefined();
  });

  // Negative
  it("rejects with the server error code when a version is already in progress", async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      jsonResponse(409, { code: "VERSION_IN_PROGRESS", message: "Draft exists" }),
    );

    // Act
    const failure = startCaseVersion(CASE_ID);

    // Assert
    await expect(failure).rejects.toMatchObject({ status: 409, code: "VERSION_IN_PROGRESS" });
    await expect(failure).rejects.toBeInstanceOf(ApiError);
  });

  // Edge: an id with reserved characters must not change the route.
  it("encodes the case id in the path", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(201, {}));

    // Act
    await startCaseVersion("a/b?c");

    // Assert
    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/cases/a%2Fb%3Fc/versions`);
  });
});

describe("listCaseVersions", () => {
  // Positive
  it("gets the versions of the case", async () => {
    // Arrange
    const rows = [
      {
        version_no: 2,
        status: "draft",
        author: { id: "u1", name: "Aileen" },
        created_at: "2026-10-03T07:05:00Z",
        changed: ["category"],
      },
    ];
    fetchMock.mockResolvedValue(jsonResponse(200, rows));

    // Act
    const versions = await listCaseVersions(CASE_ID);

    // Assert
    expect(versions).toEqual(rows);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/cases/${CASE_ID}/versions`);
    expect(init?.method).toBeUndefined();
  });

  // Negative
  it("rejects with status 404 when the case does not exist", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(404, { code: "CASE_NOT_FOUND", message: "no case" }));

    // Act
    const failure = listCaseVersions(CASE_ID);

    // Assert
    await expect(failure).rejects.toMatchObject({ status: 404, code: "CASE_NOT_FOUND" });
  });

  // Edge
  it("returns an empty list as is", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    // Act
    const versions = await listCaseVersions(CASE_ID);

    // Assert
    expect(versions).toEqual([]);
  });
});

describe("compareCaseVersions", () => {
  // Positive
  it("sends both version numbers as query parameters", async () => {
    // Arrange
    const body = { a: { version_no: 1 }, b: { version_no: 2 }, changed: ["legal_refs"] };
    fetchMock.mockResolvedValue(jsonResponse(200, body));

    // Act
    const result = await compareCaseVersions(CASE_ID, 1, 2);

    // Assert
    expect(result).toEqual(body);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `${BASE_URL}/cases/${CASE_ID}/versions/compare?a=1&b=2`,
    );
  });

  // Negative
  it("rejects with status 404 when a version number does not exist", async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      jsonResponse(404, { code: "VERSION_NOT_FOUND", message: "no version 9" }),
    );

    // Act
    const failure = compareCaseVersions(CASE_ID, 1, 9);

    // Assert
    await expect(failure).rejects.toMatchObject({ status: 404, code: "VERSION_NOT_FOUND" });
  });

  // Edge: the same version on both sides is a valid request and the server answers it.
  it("allows comparing a version with itself", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, { changed: [] }));

    // Act
    const result = await compareCaseVersions(CASE_ID, 2, 2);

    // Assert
    expect(result).toEqual({ changed: [] });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("a=2&b=2");
  });
});
