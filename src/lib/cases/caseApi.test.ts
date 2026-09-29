import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, BASE_URL } from "@/lib/apiClient";
import { createCase, getCase, updateCase } from "./caseApi";
import { emptyCaseFormValues, toCaseWritePayload } from "./caseFormMapping";

const SUITE_ID = "11111111-1111-1111-1111-111111111111";
const payload = toCaseWritePayload(emptyCaseFormValues());

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

describe("createCase", () => {
  // Positive
  it("posts the payload to the suite's cases endpoint and returns the created case", async () => {
    fetchMock.mockResolvedValue(jsonResponse(201, { id: "case-1", status: "draft" }));

    const created = await createCase(SUITE_ID, payload);

    expect(created).toEqual({ id: "case-1", status: "draft" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/suites/${SUITE_ID}/cases`);
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(JSON.parse(String(init?.body))).toEqual(payload);
  });

  // Negative
  it("rejects with ApiError carrying the server code", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(409, { code: "CASE_CODE_TAKEN", message: "sudah dipakai" }),
    );

    await expect(createCase(SUITE_ID, payload)).rejects.toMatchObject({
      status: 409,
      code: "CASE_CODE_TAKEN",
    });
  });

  it("rejects when the network fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(createCase(SUITE_ID, payload)).rejects.toThrow("Failed to fetch");
  });

  // Corner: the id comes from the URL, so it must not be able to change the path.
  it("encodes the suite id so a crafted id cannot reach another endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { code: "NOT_FOUND" }));

    await expect(createCase("../users?x=1", payload)).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      `${BASE_URL}/suites/..%2Fusers%3Fx%3D1/cases`,
    );
  });
});

const CASE_ID = "22222222-2222-2222-2222-222222222222";

describe("getCase", () => {
  // Positive
  it("reads one case with the session cookie", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: CASE_ID, status: "draft" }));

    const saved = await getCase(CASE_ID);

    expect(saved).toEqual({ id: CASE_ID, status: "draft" });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/cases/${CASE_ID}`);
    expect(init?.method ?? "GET").toBe("GET");
    expect(init?.credentials).toBe("include");
  });

  // Negative
  it("rejects with ApiError on 404", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { code: "NOT_FOUND", message: "Kasus tidak ditemukan" }));

    await expect(getCase(CASE_ID)).rejects.toMatchObject({ status: 404, code: "NOT_FOUND" });
  });

  // Corner
  it("encodes the case id so a crafted id cannot reach another endpoint", async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { code: "NOT_FOUND" }));

    await expect(getCase("../suites?x=1")).rejects.toBeInstanceOf(ApiError);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/cases/..%2Fsuites%3Fx%3D1`);
  });
});

describe("updateCase", () => {
  // Positive
  it("puts the payload to the case endpoint and returns the updated case", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: CASE_ID, version: 2 }));

    const updated = await updateCase(CASE_ID, payload);

    expect(updated).toEqual({ id: CASE_ID, version: 2 });
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/cases/${CASE_ID}`);
    expect(init?.method).toBe("PUT");
    expect(init?.credentials).toBe("include");
    expect(JSON.parse(String(init?.body))).toEqual(payload);
  });

  // Negative
  it("rejects with ApiError carrying the field from a 422", async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(422, {
        code: "FIELD_REQUIRED",
        message: "Field legal_refs[0].pasal wajib diisi",
        field: "legal_refs[0].pasal",
      }),
    );

    await expect(updateCase(CASE_ID, payload)).rejects.toMatchObject({
      status: 422,
      field: "legal_refs[0].pasal",
    });
  });

  it("rejects when the network fails", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(updateCase(CASE_ID, payload)).rejects.toThrow("Failed to fetch");
  });

  // Corner
  it("encodes the case id in the path", async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, {}));

    await updateCase("a/b", payload);

    expect(fetchMock.mock.calls[0]?.[0]).toBe(`${BASE_URL}/cases/a%2Fb`);
  });
});
