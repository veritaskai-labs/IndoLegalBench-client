import { beforeEach, describe, expect, it, vi } from "vitest";
import * as apiClient from "@/lib/apiClient";
import { ApiError } from "@/lib/apiClient";
import {
  answerErrorMessage,
  isConfirmationRequired,
  manualAnswerGateway,
} from "./manualAnswersApi";
import type { ManualAnswerSaveRequest } from "@/types/measurement";

const REQUEST: ManualAnswerSaveRequest = {
  snapshot_item_id: "snap-1",
  attempt_no: 2,
  answer_md: "Jawaban",
  obtained_at: "2026-11-08T03:30:00.000Z",
  platform_refused: false,
  note: null,
  confirm: false,
};

beforeEach(() => {
  vi.restoreAllMocks();
});

describe("manualAnswerGateway.saveAnswer (AC4-AC7)", () => {
  // Positive: PUT with the request as the JSON body.
  it("sends PUT to the answers route with the request body", async () => {
    // Arrange
    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue({ attempt_id: "att-1" });

    // Act
    const result = await manualAnswerGateway.saveAnswer("sesi-1", REQUEST);

    // Assert
    expect(spy).toHaveBeenCalledWith("/manual-measurements/sesi-1/answers", {
      method: "PUT",
      body: JSON.stringify(REQUEST),
    });
    expect(result).toEqual({ attempt_id: "att-1" });
  });

  // Edge: ids that are not URL safe are encoded.
  it("encodes the session id", async () => {
    // Arrange
    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue({});

    // Act
    await manualAnswerGateway.saveAnswer("a/b c", REQUEST);

    // Assert
    expect(spy.mock.calls[0][0]).toBe("/manual-measurements/a%2Fb%20c/answers");
  });

  // Negative: a server refusal reaches the caller unchanged.
  it("passes a server error on to the caller", async () => {
    // Arrange
    const error = new ApiError(409, "CONFIRMATION_REQUIRED");
    vi.spyOn(apiClient, "apiFetch").mockRejectedValue(error);

    // Act
    const call = manualAnswerGateway.saveAnswer("sesi-1", REQUEST);

    // Assert
    await expect(call).rejects.toBe(error);
  });
});

describe("manualAnswerGateway.getHistory (AC5)", () => {
  // Positive.
  it("sends GET to the history route of the answer slot", async () => {
    // Arrange
    const entries = [{ id: "h-1" }];
    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(entries);

    // Act
    const result = await manualAnswerGateway.getHistory("sesi-1", "snap-1", 2);

    // Assert
    expect(spy).toHaveBeenCalledWith("/manual-measurements/sesi-1/answers/snap-1/2/history");
    expect(result).toBe(entries);
  });

  // Edge: both ids are encoded.
  it("encodes the snapshot item id", async () => {
    // Arrange
    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue([]);

    // Act
    await manualAnswerGateway.getHistory("s", "x/y", 1);

    // Assert
    expect(spy.mock.calls[0][0]).toBe("/manual-measurements/s/answers/x%2Fy/1/history");
  });
});

describe("manualAnswerGateway evidence (AC7)", () => {
  // Positive: list.
  it("lists the evidence of an answer slot", async () => {
    // Arrange
    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue([{ id: "e-1" }]);

    // Act
    const result = await manualAnswerGateway.listEvidence("sesi-1", "snap-1", 1);

    // Assert
    expect(spy).toHaveBeenCalledWith("/manual-measurements/sesi-1/answers/snap-1/1/evidence");
    expect(result).toEqual([{ id: "e-1" }]);
  });

  // Positive: a file goes as multipart with the field "file" only.
  it("uploads a file as multipart form data", async () => {
    // Arrange
    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue({ id: "e-1" });
    const file = new File(["png"], "bukti.png", { type: "image/png" });

    // Act
    await manualAnswerGateway.addEvidence("sesi-1", "snap-1", 1, { kind: "file", file });

    // Assert
    const [path, init] = spy.mock.calls[0];
    expect(path).toBe("/manual-measurements/sesi-1/answers/snap-1/1/evidence");
    expect(init?.method).toBe("POST");
    const body = init?.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect(Array.from(body.keys())).toEqual(["file"]);
    expect((body.get("file") as File).name).toBe("bukti.png");
  });

  // Positive: a link goes as the form field "url" only, trimmed.
  it("sends a link as the url field, trimmed", async () => {
    // Arrange
    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue({ id: "e-2" });

    // Act
    await manualAnswerGateway.addEvidence("sesi-1", "snap-1", 1, { kind: "link", url: "  https://contoh.id/a  " });

    // Assert
    const body = spy.mock.calls[0][1]?.body as FormData;
    expect(Array.from(body.keys())).toEqual(["url"]);
    expect(body.get("url")).toBe("https://contoh.id/a");
  });

  // Positive: delete.
  it("deletes one evidence item", async () => {
    // Arrange
    const spy = vi.spyOn(apiClient, "apiFetch").mockResolvedValue(undefined);

    // Act
    await manualAnswerGateway.deleteEvidence("sesi-1", "e-1");

    // Assert
    expect(spy).toHaveBeenCalledWith("/manual-measurements/sesi-1/evidence/e-1", { method: "DELETE" });
  });

  // Positive: download as a Blob.
  it("downloads an evidence file as a Blob", async () => {
    // Arrange
    const blob = new Blob(["x"]);
    const spy = vi.spyOn(apiClient, "apiFetchBlob").mockResolvedValue(blob);

    // Act
    const result = await manualAnswerGateway.downloadEvidence("sesi-1", "e-1");

    // Assert
    expect(spy).toHaveBeenCalledWith("/manual-measurements/sesi-1/evidence/e-1/file");
    expect(result).toBe(blob);
  });

  // Negative: the 4th item is refused by the server and the caller sees the code.
  it("passes the limit error of the server on to the caller", async () => {
    // Arrange
    const error = new ApiError(409, "EVIDENCE_LIMIT_REACHED");
    vi.spyOn(apiClient, "apiFetch").mockRejectedValue(error);

    // Act
    const call = manualAnswerGateway.addEvidence("sesi-1", "snap-1", 1, { kind: "link", url: "https://a.id" });

    // Assert
    await expect(call).rejects.toBe(error);
  });
});

describe("isConfirmationRequired (AC5)", () => {
  // Positive.
  it("is true for 409 CONFIRMATION_REQUIRED", () => {
    // Arrange
    const error = new ApiError(409, "CONFIRMATION_REQUIRED");

    // Act
    const result = isConfirmationRequired(error);

    // Assert
    expect(result).toBe(true);
  });

  // Negative: other conflicts and other kinds of errors.
  it.each([
    new ApiError(409, "MANUAL_SESSION_FINALIZED"),
    new ApiError(422, "CONFIRMATION_REQUIRED"),
    new Error("jaringan"),
    "teks",
    null,
  ])("is false for %o", (error) => {
    // Arrange
    // (error comes from the table)

    // Act
    const result = isConfirmationRequired(error);

    // Assert
    expect(result).toBe(false);
  });
});

describe("answerErrorMessage", () => {
  // Positive: the message of the server wins, it is already in Indonesian and specific.
  it("prefers the server message", () => {
    // Arrange
    const error = new ApiError(422, "EVIDENCE_TYPE_MISMATCH", "Isi berkas tidak sesuai ekstensinya.");

    // Act
    const message = answerErrorMessage(error);

    // Assert
    expect(message).toBe("Isi berkas tidak sesuai ekstensinya.");
  });

  // Positive: known codes without a server message use the local table.
  it.each([
    ["MANUAL_SESSION_FINALIZED", "Sesi ini sudah ditandai selesai, jawaban tidak bisa diubah lagi."],
    ["MANUAL_SESSION_NOT_FOUND", "Sesi pengukuran manual tidak ditemukan."],
    ["EVIDENCE_LIMIT_REACHED", "Bukti sudah mencapai batas 3 per jawaban. Hapus satu bukti untuk menambah yang baru."],
    ["EVIDENCE_TOO_LARGE", "Berkas bukti melebihi batas ukuran yang ditetapkan tim."],
    ["EVIDENCE_NOT_FOUND", "Bukti tidak ditemukan. Mungkin sudah dihapus."],
    ["FORBIDDEN", "Anda tidak memiliki akses untuk tindakan ini."],
  ])("maps %s", (code, expected) => {
    // Arrange
    const error = new ApiError(400, code);

    // Act
    const message = answerErrorMessage(error);

    // Assert
    expect(message).toBe(expected);
  });

  // Edge: an unknown code, a network failure and a non-error use the fallback.
  it.each([new ApiError(500, "ENTAH"), new TypeError("Failed to fetch"), undefined])(
    "uses the fallback for %o",
    (error) => {
      // Arrange
      // (error comes from the table)

      // Act
      const message = answerErrorMessage(error);

      // Assert
      expect(message).toBe("Terjadi kesalahan. Coba lagi.");
    },
  );

  it("uses a custom fallback when given", () => {
    // Arrange
    const error = new Error("x");

    // Act
    const message = answerErrorMessage(error, "Gagal menyimpan.");

    // Assert
    expect(message).toBe("Gagal menyimpan.");
  });
});
