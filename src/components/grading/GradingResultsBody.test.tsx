/**
 * Tes GradingResultsBody: isi hasil penilaian yang dipakai halaman detail sesi dan dua halaman Laporan
 * (PBI-14 AC6, AC8). Fokusnya temuan UAT K-11 (SCRUM-291, TC_87 dan TC_88): ringkasan harus menyebut
 * LLM judge yang menilai, yaitu nama produk dan modelnya. Komponen ini hanya menampilkan; data
 * diberikan lewat props, jadi tidak ada panggilan server di sini.
 * Label tes: Positif = judge tampil, Negatif = keadaan tanpa hasil, Edge = judge tidak lengkap.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { gradingResponse } from "@/test/gradingFixtures";
import { resultMeta } from "@/test/resultMeta";
import type { GradingJudge, SessionGradingResponse } from "@/types/grading";
import { GradingResultsBody } from "./GradingResultsBody";

type Results = Parameters<typeof GradingResultsBody>[0]["results"];

/** Hasil yang sudah termuat; reload disertakan karena komponen memakainya di keadaan gagal. */
function ready(data: SessionGradingResponse | null, reload = vi.fn()): Results {
  return { status: "ready", data, reload };
}

function judge(overrides: Partial<GradingJudge> = {}): GradingJudge {
  return { judge_provider_id: "judge-a", name: "Judge Alfa", model_version: "alfa-2", cost_idr: null, ...overrides };
}

describe("GradingResultsBody LLM judge in the summary (K-11, SCRUM-291)", () => {
  // Positif: inti K-11, klien melihat AI mana yang menilai, dengan nama produk dan modelnya.
  it("names the judge product and model next to the rubric version and grading time", () => {
    // Arrange
    const results = ready(gradingResponse({ judge: judge() }));

    // Act
    render(<GradingResultsBody results={results} />);

    // Assert
    expect(resultMeta("Penilai LLM")).toBe("Judge Alfa · alfa-2");
    expect(resultMeta("Rubrik")).toBe("Versi 1");
    expect(resultMeta("Dinilai")).toBe("07 Nov 2026, 10.00 WIB");
    expect(screen.getByRole("table", { name: "Skor sesi" })).toBeInTheDocument();
  });

  // Positif: setelah nilai ulang dengan judge lain, ringkasan mengikuti judge milik run yang tampil.
  it("follows the judge of the run that is shown", () => {
    // Arrange
    const { rerender } = render(<GradingResultsBody results={ready(gradingResponse({ judge: judge() }))} />);

    // Act
    rerender(
      <GradingResultsBody
        results={ready(gradingResponse({ grading_run_id: "run-2", judge: judge({ name: "Judge Beta", model_version: "beta-1" }) }))}
      />,
    );

    // Assert
    expect(resultMeta("Penilai LLM")).toBe("Judge Beta · beta-1");
    expect(screen.queryByText(/Judge Alfa/)).not.toBeInTheDocument();
  });

  // Edge: judge tidak melaporkan model (misalnya semua panggilannya gagal); nama produk tetap tampil.
  it("shows the product name alone when the judge reported no model", () => {
    // Arrange
    const results = ready(gradingResponse({ judge: judge({ model_version: null }) }));

    // Act
    render(<GradingResultsBody results={results} />);

    // Assert
    expect(resultMeta("Penilai LLM")).toBe("Judge Alfa");
  });

  // Edge: run lama dinilai sebelum judge dicatat (null atau tidak dikirim); barisnya menyebut itu.
  it.each([null, undefined])("says the judge was not recorded for an old run (%s)", (missing) => {
    // Arrange
    const results = ready(gradingResponse({ judge: missing }));

    // Act
    render(<GradingResultsBody results={results} />);

    // Assert
    expect(resultMeta("Penilai LLM")).toBe("tidak tercatat");
  });

  // Negatif: sesi yang belum dinilai belum punya judge, jadi baris judge tidak boleh tampil.
  it("shows no judge line for a session that is not graded yet", async () => {
    // Arrange
    const user = userEvent.setup();
    const onClick = vi.fn();

    // Act
    render(<GradingResultsBody results={ready(null)} gradeAction={{ label: "Nilai", onClick }} />);
    await user.click(screen.getByRole("button", { name: "Nilai" }));

    // Assert
    expect(screen.getByText("Sesi ini belum dinilai.")).toBeInTheDocument();
    expect(resultMeta("Penilai LLM")).toBeNull();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // Negatif: selama memuat belum ada yang bisa disebut, hanya tanda memuat.
  it("shows no judge line while the result loads", () => {
    // Arrange
    const results: Results = { status: "loading", reload: vi.fn() };

    // Act
    render(<GradingResultsBody results={results} />);

    // Assert
    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(resultMeta("Penilai LLM")).toBeNull();
  });

  // Negatif: saat gagal memuat, pesan galat dan tombol coba lagi yang tampil, bukan ringkasan.
  it("shows the error with a retry instead of the summary when loading failed", async () => {
    // Arrange
    const user = userEvent.setup();
    const reload = vi.fn();
    const results: Results = { status: "error", message: "Gagal memuat hasil penilaian. Coba lagi.", reload };

    // Act
    render(<GradingResultsBody results={results} />);
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(screen.getByRole("alert")).toHaveTextContent("Gagal memuat hasil penilaian. Coba lagi.");
    expect(resultMeta("Penilai LLM")).toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});

describe("GradingResultsBody layout (SCRUM-375 C4)", () => {
  // Positive (C4): the version links to the rubric list when the page can open it (Admin).
  it("links the rubric version to the rubric list when a link is given", () => {
    // Act
    render(<GradingResultsBody results={ready(gradingResponse({ rubric_version: "v8" }))} rubricHref="/admin/rubrics" />);

    // Assert
    expect(screen.getByRole("link", { name: "Versi 8" })).toHaveAttribute("href", "/admin/rubrics");
  });

  // Negative: the Laporan pages are also for roles that cannot open /admin/rubrics, so no link there.
  it("shows the version as plain text without a link", () => {
    // Act
    render(<GradingResultsBody results={ready(gradingResponse({ rubric_version: "v8" }))} />);

    // Assert
    expect(resultMeta("Rubrik")).toBe("Versi 8");
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  // Positive: two named parts, and a hint that a case row opens its attempts.
  it("names the score summary and the per-case table and says a row opens", () => {
    // Act
    render(<GradingResultsBody results={ready(gradingResponse())} />);

    // Assert
    expect(screen.getByRole("heading", { name: "Rata-rata skor" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Skor per kasus" })).toBeInTheDocument();
    expect(screen.getByText("Klik baris untuk melihat skor tiap percobaan.")).toBeInTheDocument();
  });

  // Positive (C4): each score column explains itself with an info tip that names the rubric version.
  it("explains each score column with an info tip", () => {
    // Act
    render(<GradingResultsBody results={ready(gradingResponse({ rubric_version: "v8" }))} />);

    // Assert
    const summary = within(screen.getByRole("table", { name: "Skor sesi" }));
    expect(summary.getByRole("button", { name: "Penjelasan Kualitas LLM" })).toHaveAccessibleDescription(
      "Skor penilai LLM untuk kualitas jawaban, dari prompt penilai kualitas di rubrik Versi 8. Nilainya 0,00 sampai 1,00: bagian kriteria kasus yang terpenuhi.",
    );
    expect(summary.getByRole("button", { name: "Penjelasan Format LLM" })).toHaveAccessibleDescription(/prompt penilai format di rubrik Versi 8/);
    expect(summary.getByRole("button", { name: "Penjelasan Deterministik" })).toHaveAccessibleDescription(/rujukan peraturan dan pasal/);
  });
});
