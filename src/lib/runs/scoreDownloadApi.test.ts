import { afterEach, describe, expect, it, vi } from "vitest";

import { pendingScoreDownload, scoreFileName } from "./scoreDownloadApi";

const HEADER = "kasus,produk,skor,jenis_pengukuran,versi_kasus,versi_rubrik,versi_model\n";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pendingScoreDownload (placeholder until SCRUM-327)", () => {
  it("returns a header-only csv and does not call the network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const file = await pendingScoreDownload.download("s-1");

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(file.fileName).toBe("skor-s-1.csv");
    expect(file.blob.type).toBe("text/csv;charset=utf-8");
    expect(await file.blob.text()).toBe(HEADER);
  });

  // The placeholder must not become a report: no answers, reasons, or scores from the page.
  it("does not copy session text into the file", async () => {
    const answer = "Jawaban mentah yang tidak boleh ikut";
    const reason = "Alasan penilaian yang tidak boleh ikut";

    const file = await pendingScoreDownload.download("11111111-1111-1111-1111-111111111111");

    expect(await file.blob.text()).not.toContain(answer);
    expect(await file.blob.text()).not.toContain(reason);
    expect(await file.blob.text()).not.toMatch(/[=+@-]/);
  });
});

describe("scoreFileName", () => {
  it("keeps a uuid", () => {
    expect(scoreFileName("11111111-1111-1111-1111-111111111111")).toBe(
      "skor-11111111-1111-1111-1111-111111111111.csv",
    );
  });

  // Negative: the id is only a label. Quotes, paths, and header breaks must not reach the download name.
  it.each([
    ["empty", ""],
    ["path", "../skor.csv"],
    ["quote and newline", 'skor"\r\n.csv'],
    ["spaces", "sesi november"],
    ["too long", "a".repeat(65)],
  ])("falls back to skor.csv for a %s id", (_name, sessionId) => {
    expect(scoreFileName(sessionId)).toBe("skor.csv");
  });
});
