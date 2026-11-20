import { afterEach, describe, expect, it, vi } from "vitest";

import { apiFetchBlob } from "@/lib/apiClient";
import { httpScoreDownload, scoreFileName } from "./scoreDownloadApi";

vi.mock("@/lib/apiClient", () => ({ apiFetchBlob: vi.fn() }));

const fetchBlob = vi.mocked(apiFetchBlob);
const SESSION_ID = "11111111-1111-1111-1111-111111111111";

afterEach(() => {
  fetchBlob.mockReset();
});

describe("httpScoreDownload (GET /reports/sessions/{id}/csv)", () => {
  it("returns the server file for this session and does not build one locally", async () => {
    const blob = new Blob(["dari-server"], { type: "text/csv;charset=utf-8" });
    fetchBlob.mockResolvedValue(blob);

    const file = await httpScoreDownload.download(SESSION_ID);

    expect(fetchBlob).toHaveBeenCalledTimes(1);
    expect(fetchBlob).toHaveBeenCalledWith(`/reports/sessions/${SESSION_ID}/csv`, { silentForbidden: true });
    expect(file.blob).toBe(blob);
    expect(file.fileName).toBe(`skor-${SESSION_ID}.csv`);
    expect(await file.blob.text()).toBe("dari-server");
  });

  // The id is a path segment. A crafted id must not change which route is called.
  it("encodes the session id in the path", async () => {
    fetchBlob.mockResolvedValue(new Blob(["ok"]));

    const file = await httpScoreDownload.download("id/../secret");

    expect(fetchBlob).toHaveBeenCalledWith("/reports/sessions/id%2F..%2Fsecret/csv", { silentForbidden: true });
    expect(file.fileName).toBe("skor.csv");
  });
});

describe("scoreFileName", () => {
  it("keeps a uuid", () => {
    expect(scoreFileName(SESSION_ID)).toBe(`skor-${SESSION_ID}.csv`);
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
