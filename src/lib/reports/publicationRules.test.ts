import { describe, expect, it } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { firstReport } from "@/test/reportFixtures";

import {
  DEV_SCORES_MESSAGE,
  canPublish,
  candidateLabel,
  productLabelsText,
  publishErrorMessage,
  publishState,
  publishedListErrorMessage,
  replaceOptionLabel,
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

  it("covers a missing report, a non-Admin and anything else", () => {
    expect(publishErrorMessage(new ApiError(404, "REPORT_NOT_FOUND"))).toBe("Laporan tidak ditemukan.");
    expect(publishErrorMessage(new ApiError(403, "FORBIDDEN"))).toBe("Hanya Admin yang bisa menerbitkan laporan.");
    expect(publishErrorMessage(new Error("network"))).toBe("Laporan gagal diterbitkan. Coba lagi.");
  });
});

describe("labels", () => {
  it("names versions and replace choices", () => {
    expect(versionLabel(2)).toBe("Versi 2");
    expect(replaceOptionLabel({ title: "Perbandingan Oktober", version_no: 3 })).toBe("Perbandingan Oktober (Versi 3)");
  });

  // AC10: the server already froze the names under the PBI-15 rule (real name or code); the list shows them as is.
  it("shows the frozen product labels exactly as the server sent them", () => {
    expect(productLabelsText(["AiYU", "Produk B"])).toBe("AiYU, Produk B");
    expect(productLabelsText([])).toBe("Tidak ada produk");
  });

  it("tells replacement candidates with the same title apart by date and language", () => {
    expect(candidateLabel(firstReport({ title: "Perbandingan", created_at: "2026-11-19T03:15:00Z", language: "id" }))).toBe(
      "Perbandingan · 19 Nov 2026 · ID",
    );
  });

  it("has a retryable message for the published list", () => {
    expect(publishedListErrorMessage()).toBe("Gagal memuat daftar laporan terbit. Coba lagi.");
  });
});
