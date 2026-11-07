import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CaseCompleteness } from "@/types/case";
import { CompletenessIndicator } from "./CompletenessIndicator";

function completeness(
  overrides: Partial<CaseCompleteness> = {},
): CaseCompleteness {
  return {
    is_complete: false,
    ready_for_review: false,
    pct: 67,
    missing: [
      {
        field: "answer_criteria",
        message: "Butuh minimal satu kriteria jawaban.",
      },
      { field: "split_tag", message: "Tag dev atau test wajib dipilih." },
    ],
    legal_ref_count: 1,
    ...overrides,
  };
}

function renderReady(data: CaseCompleteness) {
  render(
    <CompletenessIndicator
      status="ready"
      completeness={data}
      onRetry={vi.fn()}
    />,
  );
}

describe("CompletenessIndicator", () => {
  // Positive: AC4 progress and what is still missing.
  it("shows the percentage as a progress bar and lists what is missing", () => {
    renderReady(completeness());

    expect(screen.getByText("Kelengkapan 67%")).toBeInTheDocument();
    expect(
      screen.getByRole("progressbar", { name: "Kelengkapan kasus" }),
    ).toHaveAttribute("aria-valuenow", "67");
    expect(
      screen.getByText("Butuh minimal satu kriteria jawaban."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Tag dev atau test wajib dipilih."),
    ).toBeInTheDocument();
  });

  // Positive: kasus siap tanpa kekurangan menampilkan badge.
  it("shows the Siap diajukan review badge for a ready case", () => {
    renderReady(
      completeness({
        pct: 100,
        is_complete: true,
        ready_for_review: true,
        missing: [],
      }),
    );

    expect(screen.getByText("Siap diajukan review")).toBeInTheDocument();
    expect(screen.queryByText("Belum lengkap:")).not.toBeInTheDocument();
  });

  // Corner: aturan ada di server, jadi kekurangan yang dikirim server tampil apa adanya.
  it("lists every missing part the server reports, without filtering any field", () => {
    const missing = [
      ...completeness().missing,
      { field: "split_tag", message: "Tag dev atau test wajib dipilih (lagi)." },
    ];
    renderReady(completeness({ missing }));

    expect(
      screen.getAllByRole("listitem").map((item) => item.textContent),
    ).toEqual(missing.map(({ message }) => message));
  });

  it("shows the Siap diajukan review badge when the case is ready", () => {
    renderReady(
      completeness({
        pct: 100,
        is_complete: true,
        ready_for_review: true,
        missing: [],
      }),
    );

    expect(screen.getByText("Siap diajukan review")).toBeInTheDocument();
    expect(screen.queryByText("Belum lengkap:")).not.toBeInTheDocument();
  });

  // Negative
  it("does not show the badge while something is missing", () => {
    renderReady(
      completeness({ missing: [completeness().missing[0]] }),
    );

    expect(screen.queryByText("Siap diajukan review")).not.toBeInTheDocument();
  });

  // Corner: loading after a save, and a failed request.
  it("says it is recalculating while loading", () => {
    render(<CompletenessIndicator status="loading" onRetry={vi.fn()} />);

    expect(screen.getByRole("status")).toHaveTextContent(
      "Menghitung kelengkapan…",
    );
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("offers a retry when the request fails", async () => {
    const onRetry = vi.fn();
    render(<CompletenessIndicator status="error" onRetry={onRetry} />);

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Gagal memuat kelengkapan kasus.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Coba lagi" }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("shows 0% as an empty bar rather than hiding it", () => {
    renderReady(completeness({ pct: 0 }));

    expect(screen.getByText("Kelengkapan 0%")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });
  // "Siap diajukan review" hanya bermakna selama kasusnya masih bisa diajukan;
  // setelah diajukan atau disetujui, kalimat itu menyesatkan.
  it("drops the ready badge once the case can no longer be submitted", () => {
    render(
      <CompletenessIndicator
        status="ready"
        completeness={{
          is_complete: true,
          ready_for_review: true,
          pct: 100,
          missing: [],
          legal_ref_count: 1,
        }}
        submittable={false}
        onRetry={vi.fn()}
      />,
    );

    expect(screen.getByText("Kelengkapan 100%")).toBeInTheDocument();
    expect(screen.queryByText("Siap diajukan review")).not.toBeInTheDocument();
  });
});
