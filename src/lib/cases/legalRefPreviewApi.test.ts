import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, BASE_URL } from "@/lib/apiClient";
import type { LegalRefPayload } from "./caseFormMapping";
import { previewLegalRefs, type LegalRefPreviewItem } from "./legalRefPreviewApi";

// fetch adalah satu-satunya jalan keluar modul ini, jadi stub fetch cukup untuk
// memeriksa request persisnya tanpa server.
const fetchMock = vi.fn<typeof fetch>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** KTK-001 (Sprint 1): Pasal 156 UU 13/2003. */
const KTK_001: LegalRefPayload = {
  kind: "structured",
  free_text: null,
  links: [
    {
      form: "pasal",
      connector: "none",
      regulation_type: "uu",
      number: "13",
      year: 2003,
      about: "",
      pasal: "156",
      angka: null,
      ayat: "",
      huruf: "",
    },
  ],
};

const ITEMS: LegalRefPreviewItem[] = [{ display_text: "Pasal 156 UU 13/2003", error: null }];

function sentBody(): unknown {
  const [, init] = fetchMock.mock.calls[0] ?? [];
  return JSON.parse(String(init?.body));
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("previewLegalRefs", () => {
  // Positif
  it("POSTs the citations to /legal-refs/preview with the session cookie", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, { items: ITEMS }));

    // Act
    await previewLegalRefs([KTK_001], null);

    // Assert
    const [url, init] = fetchMock.mock.calls[0] ?? [];
    expect(url).toBe(`${BASE_URL}/legal-refs/preview`);
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("include");
    expect(sentBody()).toEqual({ legal_refs: [KTK_001] });
  });

  it("returns the items in the order the server sent them", async () => {
    // Arrange
    const items: LegalRefPreviewItem[] = [
      ...ITEMS,
      {
        display_text: null,
        error: {
          code: "FIELD_REQUIRED",
          message: "Nomor peraturan wajib diisi.",
          field: "legal_refs[1].links[0].number",
        },
      },
    ];
    fetchMock.mockResolvedValue(jsonResponse(200, { items }));

    // Act
    const result = await previewLegalRefs([KTK_001, KTK_001], null);

    // Assert
    expect(result).toEqual(items);
  });

  it("sends case_id when the case already exists, so its stored types count", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, { items: ITEMS }));

    // Act
    await previewLegalRefs([KTK_001], "case-1");

    // Assert
    expect(sentBody()).toEqual({ legal_refs: [KTK_001], case_id: "case-1" });
  });

  it("passes the abort signal on, so a newer keystroke can cancel this request", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, { items: ITEMS }));
    const controller = new AbortController();

    // Act
    await previewLegalRefs([KTK_001], null, controller.signal);

    // Assert
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBe(controller.signal);
  });

  // Edge
  it("returns an empty list for an empty request", async () => {
    // Arrange
    fetchMock.mockResolvedValue(jsonResponse(200, { items: [] }));

    // Act
    const result = await previewLegalRefs([], null);

    // Assert
    expect(result).toEqual([]);
    expect(sentBody()).toEqual({ legal_refs: [] });
  });

  // Negatif
  it("throws ApiError with the server's code on 422", async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      jsonResponse(422, { code: "VALIDATION_ERROR", message: "too long", field: "legal_refs" }),
    );

    // Act
    const failure = await previewLegalRefs([KTK_001], null).catch((error: unknown) => error);

    // Assert
    expect(failure).toBeInstanceOf(ApiError);
    expect(failure).toMatchObject({ status: 422, code: "VALIDATION_ERROR", field: "legal_refs" });
  });

  it("lets an abort reach the caller as it is", async () => {
    // Arrange
    fetchMock.mockRejectedValue(new DOMException("aborted", "AbortError"));

    // Act
    const failure = await previewLegalRefs([KTK_001], null).catch((error: unknown) => error);

    // Assert
    expect(failure).toBeInstanceOf(DOMException);
    expect((failure as DOMException).name).toBe("AbortError");
  });
});
