import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, BASE_URL } from "@/lib/apiClient";
import { changeSplitTag } from "./splitTagApi";

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

describe("changeSplitTag", () => {
  // Positive
  it("patches the case's split-tag endpoint with the tag and the confirmation", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, { id: CASE_ID, split_tag: "test", was_dev: true }));

    // Act
    const saved = await changeSplitTag(CASE_ID, "test", true);

    // Assert
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/cases/${CASE_ID}/split-tag`);
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body))).toEqual({ split_tag: "test", confirm: true });
    expect(saved).toMatchObject({ split_tag: "test", was_dev: true });
  });

  // Edge
  it("encodes the case id in the path", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    // Act
    await changeSplitTag("a/b", "dev", false);

    // Assert
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/cases/a%2Fb/split-tag`);
  });

  // Negative
  it("surfaces the confirmation request as an ApiError with its code", async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      jsonResponse(409, {
        code: "TAG_CHANGE_NEEDS_CONFIRMATION",
        message: "Kasus ini sudah pernah terlihat developer AI",
        requires_confirmation: true,
      }),
    );

    // Act
    const error = await changeSplitTag(CASE_ID, "test", false).catch((failure) => failure);

    // Assert
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 409, code: "TAG_CHANGE_NEEDS_CONFIRMATION" });
  });
});
