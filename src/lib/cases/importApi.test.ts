import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, BASE_URL } from "@/lib/apiClient";
import type { ImportSummary } from "@/types/caseImport";
import { TEMPLATE_FILE_NAME, importGateway } from "./importApi";

/**
 * Isolation: vi.stubGlobal("fetch") with real Response objects, so the real apiFetchBlob runs (URL,
 * credentials, error parsing, 403 handling) and only the network is replaced.
 */
const fetchMock = vi.fn();

const TEMPLATE = "\uFEFFtitle,question,category,split_tag,legal_refs,must_contain,must_not_contain,expected_conclusion\r\n";

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
    // Bytes, not file.text(): text() decodes UTF-8 and drops the BOM, which Google Sheets/Excel rely on.
    const bytes = new Uint8Array(await file.arrayBuffer());
    expect(Array.from(bytes.slice(0, 3))).toEqual([0xef, 0xbb, 0xbf]);
    expect(Array.from(bytes)).toEqual(Array.from(new TextEncoder().encode(TEMPLATE)));
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

const SUMMARY: ImportSummary = {
  batch_id: "b-1",
  file_name: "kasus-lama.csv",
  imported_by: "u-1",
  imported_at: "2026-11-23T14:00:00Z",
  suite_id: "s-1",
  suite_name: "Impor CSV 23 Nov 2026 21.00 WIB (b1b1b1b1)",
  total_rows: 3,
  success_count: 1,
  failed_count: 1,
  skipped_count: 1,
  rows: [
    { row_no: 2, status: "created", case_id: "c-1", case_code: "IMPOR-B1B1B1B1-002", reason: null },
    { row_no: 3, status: "failed", case_id: null, case_code: null, reason: "must_contain: bukan list JSON yang valid." },
    { row_no: 4, status: "skipped", case_id: null, case_code: null, reason: "Kembar dengan baris 2 di berkas ini." },
  ],
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("importGateway.uploadCsv (AC4, AC7)", () => {
  // Positive: multipart POST with the file in field "file", the summary comes back.
  it("posts the file as multipart field file and returns the summary", async () => {
    // Arrange
    fetchMock.mockResolvedValue(json(201, SUMMARY));
    const file = new File(["title,question\r\n"], "kasus-lama.csv", { type: "text/csv" });

    // Act
    const summary = await importGateway.uploadCsv(file);

    // Assert
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/case-imports`);
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("include");
    expect(init.body).toBeInstanceOf(FormData);
    const sent = (init.body as FormData).get("file") as File;
    expect(sent.name).toBe("kasus-lama.csv");
    expect(await sent.text()).toBe("title,question\r\n");
    expect([...(init.body as FormData).keys()]).toEqual(["file"]);
    // The browser must set the multipart boundary itself.
    expect(init.headers).not.toHaveProperty("Content-Type");
    expect(summary).toEqual(SUMMARY);
  });

  // Negative: the whole file is rejected; code and Indonesian message reach the caller.
  it("passes a whole-file rejection on with its code and message", async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      json(422, { code: "IMPORT_TOO_MANY_ROWS", message: "Berkas berisi 501 baris kasus; maksimal 500 per berkas." }),
    );

    // Act
    const call = importGateway.uploadCsv(new File(["x"], "besar.csv"));

    // Assert
    await expect(call).rejects.toMatchObject({
      status: 422,
      code: "IMPORT_TOO_MANY_ROWS",
      serverMessage: "Berkas berisi 501 baris kasus; maksimal 500 per berkas.",
    });
  });

  // Negative: the network drops during a long upload.
  it("passes a network failure on unchanged", async () => {
    // Arrange
    const failure = new TypeError("Failed to fetch");
    fetchMock.mockRejectedValue(failure);

    // Act / Assert
    await expect(importGateway.uploadCsv(new File(["x"], "a.csv"))).rejects.toBe(failure);
  });
});

describe("importGateway.readSummary (AC7)", () => {
  // Positive: the stored summary of one batch.
  it("reads the summary of one batch", async () => {
    // Arrange
    fetchMock.mockResolvedValue(json(200, SUMMARY));

    // Act
    const summary = await importGateway.readSummary("b-1");

    // Assert
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${BASE_URL}/case-imports/b-1`);
    expect(init.method ?? "GET").toBe("GET");
    expect(summary).toEqual(SUMMARY);
  });

  // Edge: the id comes from the URL (?batch=), so it is encoded before it goes into the path.
  it("encodes a batch id taken from the address bar", async () => {
    // Arrange
    fetchMock.mockResolvedValue(json(200, SUMMARY));

    // Act
    await importGateway.readSummary("../admin?x=1");

    // Assert
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE_URL}/case-imports/..%2Fadmin%3Fx%3D1`);
  });

  // Negative: an unknown batch.
  it("passes 404 IMPORT_BATCH_NOT_FOUND on", async () => {
    // Arrange
    fetchMock.mockResolvedValue(json(404, { code: "IMPORT_BATCH_NOT_FOUND", message: "Batch impor tidak ditemukan" }));

    // Act / Assert
    await expect(importGateway.readSummary("b-x")).rejects.toMatchObject({ status: 404, code: "IMPORT_BATCH_NOT_FOUND" });
  });
});
