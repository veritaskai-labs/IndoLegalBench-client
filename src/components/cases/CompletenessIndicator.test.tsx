import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CaseCompleteness } from "@/types/case";
import { CompletenessIndicator } from "./CompletenessIndicator";

// Server sebelum SCRUM-130 masih mengirim bagian ini; indikator tidak boleh menyaringnya.
const TRAPS_MISSING = "Butuh minimal satu jebakan sebelum kasus bisa diajukan review.";

function completeness(overrides: Partial<CaseCompleteness> = {}): CaseCompleteness {
  return {
    is_complete: false,
    ready_for_review: false,
    pct: 67,
    missing: [
      { field: "answer_criteria", message: "Butuh minimal satu kriteria jawaban." },
      { field: "split_tag", message: "Tag dev atau test wajib dipilih." },
    ],
    trap_count: 0,
    legal_ref_count: 1,
    ...overrides,
  };
}

function renderReady(data: CaseCompleteness) {
  render(<CompletenessIndicator status="ready" completeness={data} onRetry={vi.fn()} />);
}

describe("CompletenessIndicator", () => {
  // Positive: AC4 progress and what is still missing.
  it("shows the percentage as a progress bar and lists what is missing", () => {
    renderReady(completeness());

    expect(screen.getByText("Kelengkapan 67%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Kelengkapan kasus" })).toHaveAttribute(
      "aria-valuenow",
      "67",
    );
    expect(screen.getByText("Butuh minimal satu kriteria jawaban.")).toBeInTheDocument();
    expect(screen.getByText("Tag dev atau test wajib dipilih.")).toBeInTheDocument();
  });

  // Positive: AC4 (revisi), jebakan opsional.
  it("shows the Siap diajukan review badge for a ready case without traps", () => {
    renderReady(
      completeness({ pct: 100, is_complete: true, ready_for_review: true, missing: [], trap_count: 0 }),
    );

    expect(screen.getByText("Siap diajukan review")).toBeInTheDocument();
    expect(screen.queryByText(/Jebakan belum ada/)).not.toBeInTheDocument();
    expect(screen.queryByText("Belum lengkap:")).not.toBeInTheDocument();
  });

  // Negative: tidak ada lagi peringatan jebakan, apa pun isi daftarnya.
  it("does not warn about missing traps while other parts are missing", () => {
    renderReady(completeness({ trap_count: 0 }));

    expect(screen.queryByText(/Jebakan belum ada/)).not.toBeInTheDocument();
    expect(screen.queryByText(/minimal satu jebakan/)).not.toBeInTheDocument();
  });

  // Corner: aturan ada di server, jadi kekurangan yang dikirim server tampil apa adanya.
  it("lists every missing part the server reports, without filtering any field", () => {
    const missing = [...completeness().missing, { field: "traps", message: TRAPS_MISSING }];
    renderReady(completeness({ missing }));

    expect(screen.getAllByRole("listitem").map((item) => item.textContent)).toEqual(
      missing.map(({ message }) => message),
    );
  });

  it("shows the Siap diajukan review badge when the case is ready", () => {
    renderReady(
      completeness({ pct: 100, is_complete: true, ready_for_review: true, missing: [], trap_count: 2 }),
    );

    expect(screen.getByText("Siap diajukan review")).toBeInTheDocument();
    expect(screen.queryByText(/Jebakan belum ada/)).not.toBeInTheDocument();
    expect(screen.queryByText("Belum lengkap:")).not.toBeInTheDocument();
  });

  // Negative
  it("does not show the badge while something is missing", () => {
    renderReady(completeness({ trap_count: 1, missing: [completeness().missing[0]] }));

    expect(screen.queryByText("Siap diajukan review")).not.toBeInTheDocument();
    expect(screen.queryByText(/Jebakan belum ada/)).not.toBeInTheDocument();
  });

  // Corner: loading after a save, and a failed request.
  it("says it is recalculating while loading", () => {
    render(<CompletenessIndicator status="loading" onRetry={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent("Menghitung kelengkapan…");
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("offers a retry when the request fails", async () => {
    const onRetry = vi.fn();
    render(<CompletenessIndicator status="error" onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent("Gagal memuat kelengkapan kasus.");
    await userEvent.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows 0% as an empty bar rather than hiding it", () => {
    renderReady(completeness({ pct: 0 }));

    expect(screen.getByText("Kelengkapan 0%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "0");
  });
});
