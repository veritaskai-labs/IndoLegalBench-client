/**
 * Tes GradingResultsBody: isi hasil penilaian yang dipakai halaman detail sesi dan dua halaman Laporan
 * (PBI-14 AC6, AC8). Fokusnya temuan UAT K-11 (SCRUM-291, TC_87 dan TC_88): ringkasan harus menyebut
 * LLM judge yang menilai, yaitu nama produk dan modelnya. Komponen ini hanya menampilkan; data
 * diberikan lewat props, jadi tidak ada panggilan server di sini.
 * Label tes: Positif = judge tampil, Negatif = keadaan tanpa hasil, Edge = judge tidak lengkap.
 */
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { gradingResponse } from "@/test/gradingFixtures";
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
    expect(screen.getByText("LLM judge: Judge Alfa · alfa-2")).toBeInTheDocument();
    expect(screen.getByText("Versi rubrik v1 · Dinilai 07 Nov 2026, 10.00 WIB")).toBeInTheDocument();
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
    expect(screen.getByText("LLM judge: Judge Beta · beta-1")).toBeInTheDocument();
    expect(screen.queryByText(/Judge Alfa/)).not.toBeInTheDocument();
  });

  // Edge: judge tidak melaporkan model (misalnya semua panggilannya gagal); nama produk tetap tampil.
  it("shows the product name alone when the judge reported no model", () => {
    // Arrange
    const results = ready(gradingResponse({ judge: judge({ model_version: null }) }));

    // Act
    render(<GradingResultsBody results={results} />);

    // Assert
    expect(screen.getByText("LLM judge: Judge Alfa")).toBeInTheDocument();
  });

  // Edge: run lama dinilai sebelum judge dicatat (null atau tidak dikirim); barisnya menyebut itu.
  it.each([null, undefined])("says the judge was not recorded for an old run (%s)", (missing) => {
    // Arrange
    const results = ready(gradingResponse({ judge: missing }));

    // Act
    render(<GradingResultsBody results={results} />);

    // Assert
    expect(screen.getByText("LLM judge: tidak tercatat")).toBeInTheDocument();
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
    expect(screen.queryByText(/LLM judge:/)).not.toBeInTheDocument();
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
    expect(screen.queryByText(/LLM judge:/)).not.toBeInTheDocument();
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
    expect(screen.queryByText(/LLM judge:/)).not.toBeInTheDocument();
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
