import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { firstReport, replaceCandidate } from "@/test/reportFixtures";

import {
  DEV_SCORES_MESSAGE,
  canPublish,
  productLabelsText,
  publishErrorMessage,
  publishState,
  publishedListErrorMessage,
  replaceCandidateLabel,
  replaceCandidatesErrorMessage,
  versionLabel,
} from "./publicationRules";

// SCRUM-335 (PBI-17 AC9, AC10, AC12): who may publish, when a report can be published, and what a refusal says.
describe("canPublish (AC9: publishing is manual and Admin only)", () => {
  it("lets only Admin publish", () => {
    expect(canPublish("admin")).toBe(true);
    for (const role of ["developer_ai", "contributor", "viewer"] as const) expect(canPublish(role)).toBe(false);
  });
});

describe("publishState", () => {
  it("is ready for a saved Test report", () => {
    expect(publishState(firstReport({ status: "saved", score_scope: "test", has_dev_scores: false }))).toBe("ready");
  });

  // AC12: anything carrying dev scores stays out of published reports.
  it.each([
    { score_scope: "dev" as const, has_dev_scores: true },
    { score_scope: "dev_test" as const, has_dev_scores: true },
    { score_scope: "test" as const, has_dev_scores: true },
  ])("blocks a report with dev scores ($score_scope, flag $has_dev_scores)", (fields) => {
    expect(publishState(firstReport({ status: "saved", ...fields }))).toBe("dev_scores");
  });

  it("knows a report that is already published or replaced", () => {
    expect(publishState(firstReport({ status: "published" }))).toBe("already_published");
    expect(publishState(firstReport({ status: "superseded" }))).toBe("superseded");
  });
});

describe("publishErrorMessage (server refusals in plain words)", () => {
  it("explains the dev score refusal clearly (AC12)", () => {
    const failure = new ApiError(409, "REPORT_HAS_DEV_SCORES");

    expect(publishErrorMessage(failure)).toBe(DEV_SCORES_MESSAGE);
    // Review #106: the server sentence wins when it is sent, so the two cannot drift apart.
    expect(publishErrorMessage(new ApiError(409, "REPORT_HAS_DEV_SCORES", "Kalimat dari server."))).toBe(
      "Kalimat dari server.",
    );
    expect(DEV_SCORES_MESSAGE).toMatch(/skor dev/);
    expect(DEV_SCORES_MESSAGE).toMatch(/Test/);
  });

  it("says the report or the chosen version changed meanwhile", () => {
    expect(publishErrorMessage(new ApiError(409, "REPORT_NOT_PUBLISHABLE"))).toMatch(/sudah terbit atau versi yang dipilih sudah diganti/);
    expect(publishErrorMessage(new ApiError(404, "PUBLICATION_NOT_FOUND"))).toMatch(/Versi terbit yang dipilih sudah tidak ada/);
  });

  // Negatif, SCRUM-373: the server still refuses another product set (server#167), e.g. a list that went stale.
  it("explains that a replacement must compare the same products", () => {
    expect(publishErrorMessage(new ApiError(409, "REPORT_PRODUCTS_MISMATCH"))).toBe(
      "Laporan pengganti harus membandingkan produk yang sama dengan versi yang diganti. Tutup dialog lalu pilih lagi.",
    );
  });

  it("covers a missing report, a non-Admin and anything else", () => {
    expect(publishErrorMessage(new ApiError(404, "REPORT_NOT_FOUND"))).toBe("Laporan tidak ditemukan.");
    expect(publishErrorMessage(new ApiError(403, "FORBIDDEN"))).toBe("Hanya Admin yang bisa menerbitkan laporan.");
    expect(publishErrorMessage(new Error("network"))).toBe("Laporan gagal diterbitkan. Coba lagi.");
  });
});

describe("labels", () => {
  it("names versions", () => {
    expect(versionLabel(2)).toBe("Versi 2");
  });

  // Positif, SCRUM-373: a published version shows its version, its products and when it was published, so
  // Admin sees the products match and can tell similar titles apart.
  it("names a published version with its products and publish date", () => {
    expect(replaceCandidateLabel(replaceCandidate({ title: "Perbandingan Oktober", version_no: 3 }))).toBe(
      "Perbandingan Oktober (Versi 3) · AiYU, Produk B · terbit 18 Nov 2026",
    );
  });

  // Positif, SCRUM-373: a saved replacement is not published yet, so its date is the day it was made.
  it("names a saved replacement with its products and creation date", () => {
    const saved = replaceCandidate({ publication_id: null, version_no: null, date: "2026-11-19T03:15:00Z" });

    expect(replaceCandidateLabel(saved)).toBe("Perbandingan Oktober · AiYU, Produk B · dibuat 19 Nov 2026");
  });

  // Edge: version 0 does not exist, but a falsy number must still be read as a published version.
  it("treats only a missing version number as a saved report", () => {
    expect(replaceCandidateLabel(replaceCandidate({ version_no: 0, product_labels: [] }))).toBe(
      "Perbandingan Oktober (Versi 0) · Tidak ada produk · terbit 18 Nov 2026",
    );
  });

  // AC10: the server already froze the names under the PBI-15 rule (real name or code); the list shows them as is.
  it("shows the frozen product labels exactly as the server sent them", () => {
    expect(productLabelsText(["AiYU", "Produk B"])).toBe("AiYU, Produk B");
    expect(productLabelsText([])).toBe("Tidak ada produk");
  });

  it("has a retryable message for the published list", () => {
    expect(publishedListErrorMessage()).toBe("Gagal memuat daftar laporan terbit. Coba lagi.");
  });

  // Negatif, SCRUM-373: the only callers are Admin, so a failed load is always worth a retry.
  it("has a retryable message for the replace choices", () => {
    expect(replaceCandidatesErrorMessage()).toBe("Gagal memuat laporan dengan produk yang sama. Coba lagi.");
  });
});
