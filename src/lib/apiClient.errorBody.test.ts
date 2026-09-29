import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, apiFetch } from "./apiClient";

// Kept apart from apiClient.test.ts so this change does not collide with the
// open refactor PR (#13) that rewrites the 403 tests in that file.

const fetchMock = vi.fn<typeof fetch>();

function errorResponse(status: number, body: string): Response {
  return new Response(body, {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function caught(): Promise<ApiError> {
  try {
    await apiFetch("/cases/1", { method: "PUT" });
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error("apiFetch did not throw");
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("ApiError body details", () => {
  // Positive
  it("keeps the server message and the failing field from a 422 body", async () => {
    fetchMock.mockResolvedValue(
      errorResponse(
        422,
        JSON.stringify({
          code: "FIELD_REQUIRED",
          message: "Field legal_refs[1].pasal wajib diisi",
          field: "legal_refs[1].pasal",
        }),
      ),
    );

    const error = await caught();

    expect(error.code).toBe("FIELD_REQUIRED");
    expect(error.serverMessage).toBe("Field legal_refs[1].pasal wajib diisi");
    expect(error.field).toBe("legal_refs[1].pasal");
  });

  it("keeps the message when the body has no field, as in 409 CASE_CODE_TAKEN", async () => {
    fetchMock.mockResolvedValue(
      errorResponse(
        409,
        JSON.stringify({
          code: "CASE_CODE_TAKEN",
          message: "Kode kasus 'ILB-1' sudah dipakai di suite 'Perburuhan'",
        }),
      ),
    );

    const error = await caught();

    expect(error.serverMessage).toBe(
      "Kode kasus 'ILB-1' sudah dipakai di suite 'Perburuhan'",
    );
    expect(error.field).toBeNull();
  });

  // Negative
  it("ignores message and field that are not strings", async () => {
    fetchMock.mockResolvedValue(
      errorResponse(422, JSON.stringify({ code: "X", message: 42, field: ["a"] })),
    );

    const error = await caught();

    expect(error.serverMessage).toBeNull();
    expect(error.field).toBeNull();
  });

  it("leaves both null when the body is not JSON", async () => {
    fetchMock.mockResolvedValue(errorResponse(500, "<html>Bad gateway</html>"));

    const error = await caught();

    expect(error.code).toBe("UNKNOWN_ERROR");
    expect(error.serverMessage).toBeNull();
    expect(error.field).toBeNull();
  });

  // Corner: existing callers build ApiError with two arguments.
  it("defaults both to null so existing two-argument callers keep working", () => {
    const error = new ApiError(500, "UNKNOWN_ERROR");

    expect(error.serverMessage).toBeNull();
    expect(error.field).toBeNull();
    expect(error.message).toBe("UNKNOWN_ERROR");
  });
});
