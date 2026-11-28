import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";

import { InReviewTable } from "./InReviewTable";
import type { InReviewRow } from "@/lib/reviews/inReviewApi";
import type { CaseReview, ReviewerSlot } from "@/types/reviewAdmin";
import userEvent from "@testing-library/user-event";

function slot(overrides: Partial<ReviewerSlot> = {}): ReviewerSlot {
  return {
    assignment_id: "a1",
    reviewer: { id: "u1", name: "Roben" },
    status: "active",
    verdict: null,
    ...overrides,
  };
}

function review(overrides: Partial<CaseReview> = {}): CaseReview {
  return {
    case_id: "c1",
    case_version_id: "v1",
    round_no: 1,
    status: "open",
    decision: null,
    opened_at: "2026-10-16T03:00:00Z",
    decided_at: null,
    reviewers: [slot()],
    ...overrides,
  };
}

function row(overrides: Partial<InReviewRow> = {}): InReviewRow {
  return {
    case: { id: "c1", case_code: "ILB-PT-0142", title: "Sengketa tanah warisan" },
    review: review(),
    newVersion: null,
    ...overrides,
  };
}

describe("InReviewTable", () => {
  it("pages cases in server order and sorts all pages by code, title, and numeric round", async () => {
    const user = userEvent.setup();
    const rows = Array.from({ length: 11 }, (_, index) => {
      const code = "CASE-" + String(11 - index).padStart(2, "0");
      return row({
        case: { id: code, case_code: code, title: "Judul " + String.fromCharCode(65 + index) },
        review: review({ round_no: 11 - index }),
      });
    });
    render(<InReviewTable rows={rows} />);
    const firstCase = () => within(screen.getAllByRole("row")[1]).getAllByRole("cell")[0];
    expect(firstCase()).toHaveTextContent("CASE-11");
    expect(screen.getAllByRole("row")).toHaveLength(11);
    await user.click(screen.getByRole("button", { name: "Berikutnya" }));
    expect(firstCase()).toHaveTextContent("CASE-01");
    await user.click(screen.getByRole("button", { name: "Kode" }));
    expect(firstCase()).toHaveTextContent("CASE-01");
    expect(screen.getByText("Halaman 1 dari 2")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Judul" }));
    expect(firstCase()).toHaveTextContent("CASE-11");
    await user.click(screen.getByRole("button", { name: "Ronde" }));
    expect(firstCase()).toHaveTextContent("CASE-01");
    expect(within(screen.getAllByRole("row")[2]).getByText("Ronde 2")).toBeVisible();
  });

  // Positif
  it("lists the case with its round and round status", () => {
    render(<InReviewTable rows={[row()]} />);

    expect(screen.getByText("ILB-PT-0142")).toBeInTheDocument();
    expect(screen.getByText("Sengketa tanah warisan")).toBeInTheDocument();
    expect(screen.getByText("Ronde 1")).toBeInTheDocument();
    expect(screen.getByText("Sedang dinilai")).toBeInTheDocument();
  });

  // Positif
  it("names every reviewer and whether they have judged", () => {
    const queued = row({
      review: review({
        reviewers: [
          slot({
            assignment_id: "a1",
            reviewer: { id: "u1", name: "Roben" },
            verdict: {
              decision: "approve",
              comment: null,
              submitted_at: "2026-10-16T04:00:00Z",
            },
          }),
          slot({
            assignment_id: "a2",
            reviewer: { id: "u9", name: "Aileen" },
          }),
        ],
      }),
    });

    render(<InReviewTable rows={[queued]} />);

    expect(screen.getByText("Roben")).toBeInTheDocument();
    expect(screen.getByText("Setuju")).toBeInTheDocument();
    expect(screen.getByText("Aileen")).toBeInTheDocument();
    expect(screen.getByText("Belum menilai")).toBeInTheDocument();
    expect(screen.queryByText("Lihat komentar")).not.toBeInTheDocument();
  });

  // Positif
  it("keeps the verdict visible while its comment can be opened and closed", async () => {
    const user = userEvent.setup();
    const queued = row({
      review: review({
        reviewers: [
          slot({
            verdict: {
              decision: "revise",
              comment: "Pasal 1320 belum dikutip.",
              submitted_at: "2026-10-16T04:00:00Z",
            },
          }),
        ],
      }),
    });

    render(<InReviewTable rows={[queued]} />);

    expect(screen.getByText("Minta revisi")).toBeInTheDocument();
    const toggle = screen.getByText("Lihat komentar");
    const comment = screen.getByText("Pasal 1320 belum dikutip.");
    expect(comment).not.toBeVisible();
    await user.click(toggle);
    expect(comment).toBeVisible();
    await user.click(toggle);
    expect(comment).not.toBeVisible();
  });

  // Positif (F-02)
  it("marks a new version of an approved case", () => {
    render(<InReviewTable rows={[row({ newVersion: 2 })]} />);

    expect(
      screen.getByText("Versi 2 · versi yang disetujui tetap berlaku"),
    ).toBeInTheDocument();
  });

  // Negatif
  it("adds no version mark to a case in its first review", () => {
    render(<InReviewTable rows={[row()]} />);

    expect(screen.queryByText(/versi yang disetujui/)).not.toBeInTheDocument();
  });

  // corner
  it("says the round has not decided yet", () => {
    render(<InReviewTable rows={[row()]} />);

    expect(screen.getByText("Belum diputuskan")).toBeInTheDocument();
  });

  // Positif
  it("names the decision once the round decided", () => {
    const queued = row({
      review: review({ status: "decided", decision: "revise" }),
    });

    render(<InReviewTable rows={[queued]} />);

    expect(screen.getByText("Perlu revisi")).toBeInTheDocument();
    expect(screen.getByText("Sudah diputuskan")).toBeInTheDocument();
  });

  // corner: ronde versi baru bisa terbuka sebelum dua reviewer terpasang (awaiting_assignment).
  it("says so when the round has no reviewer yet", () => {
    const queued = row({
      newVersion: 2,
      review: review({ status: "awaiting_assignment", reviewers: [] }),
    });

    render(<InReviewTable rows={[queued]} onReplace={vi.fn()} />);

    expect(screen.getByText("Belum ada reviewer")).toBeInTheDocument();
    expect(screen.getByText("Menunggu penugasan")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Ganti/ })).not.toBeInTheDocument();
  });

  // corner
  it("keeps the column headings when there is nothing in review", () => {
    render(<InReviewTable rows={[]} />);

    expect(screen.getAllByRole("columnheader")).toHaveLength(6);
    expect(screen.queryByRole("button", { name: /^Ganti/ })).not.toBeInTheDocument();
  });

  // AC7: reviewer yang lambat tapi masih aktif juga harus bisa diganti dari sini.
  it("hands back the slot and the row when the admin replaces a reviewer", async () => {
    const user = userEvent.setup();
    const onReplace = vi.fn();
    const second = slot({ assignment_id: "a2", reviewer: { id: "u2", name: "Dwi Eka Sari" } });
    const queued = row({ review: review({ reviewers: [slot(), second] }) });

    render(<InReviewTable rows={[queued]} onReplace={onReplace} />);
    await user.click(
      screen.getByRole("button", { name: "Ganti Dwi Eka Sari, reviewer untuk ILB-PT-0142" }),
    );

    expect(onReplace).toHaveBeenCalledWith(second, queued);
  });

  // corner: penugasan yang sudah diganti tidak bisa diganti lagi.
  it.each(["replaced", "void"] as const)("offers no replacement for a %s assignment", (status) => {
    const queued = row({
      review: review({ reviewers: [slot({ status })] }),
    });

    render(<InReviewTable rows={[queued]} onReplace={vi.fn()} />);

    expect(screen.getByText("Roben")).toBeVisible();
    expect(screen.queryByRole("button", { name: /^Ganti/ })).not.toBeInTheDocument();
  });

  it("uses English chrome and leaves the case title and comment unchanged", () => {
    const queued = row({
      review: review({
        reviewers: [
          slot({
            verdict: {
              decision: "revise",
              comment: "Pasal 1320 belum dikutip.",
              submitted_at: "2026-10-16T04:00:00Z",
            },
          }),
        ],
      }),
    });

    render(
      <LocaleProvider locale="en">
        <InReviewTable rows={[queued]} />
      </LocaleProvider>,
    );

    expect(screen.getByRole("columnheader", { name: "Code" })).toBeInTheDocument();
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getByText("Sengketa tanah warisan")).toBeInTheDocument();
    expect(screen.getByText("Pasal 1320 belum dikutip.")).toBeInTheDocument();
  });
});
