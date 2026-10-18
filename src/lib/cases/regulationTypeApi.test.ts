import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, BASE_URL } from "@/lib/apiClient";
import type { RegulationType } from "@/types/regulationType";
import { listRegulationTypes } from "./regulationTypeApi";

// fetch is the only way out of this module, so stubbing it lets us check
// the exact request without a server.
const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const TYPES: RegulationType[] = [
  {
    code: "uud",
    label: "Undang-undang Dasar Tahun 1945 dan Amandemen",
    singkatan: "UUD",
    is_active: true,
  },
  { code: "ketetapan_mpr", label: "Ketetapan MPR", singkatan: null, is_active: true },
  { code: "uu", label: "Undang-undang", singkatan: "UU", is_active: true },
];

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("listRegulationTypes", () => {
  // Positive
  it("asks the server for the inactive types too, with the session cookie", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, TYPES));

    // Act
    await listRegulationTypes();

    // Assert
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/regulation-types?include_inactive=true`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(init?.credentials).toBe("include");
  });

  it("returns the types in the order the server sent them", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, TYPES));

    // Act
    const result = await listRegulationTypes();

    // Assert
    expect(result.map((type) => type.code)).toEqual(["uud", "ketetapan_mpr", "uu"]);
    expect(result[1]).toEqual({
      code: "ketetapan_mpr",
      label: "Ketetapan MPR",
      singkatan: null,
      is_active: true,
    });
  });

  // Edge
  it("returns an empty list when the server has no active type", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, []));

    // Act
    const result = await listRegulationTypes();

    // Assert
    expect(result).toEqual([]);
  });

  // Negative
  it.each([
    [401, "UNAUTHENTICATED"],
    [403, "FORBIDDEN"],
    [500, "INTERNAL_ERROR"],
  ])("rejects with the status and code of a %i answer", async (status, code) => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(status, { code, message: "x" }));

    // Act
    const failure = await listRegulationTypes().catch((error: unknown) => error);

    // Assert
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status, code });
  });
});
