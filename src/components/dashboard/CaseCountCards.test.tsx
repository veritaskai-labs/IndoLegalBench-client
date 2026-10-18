import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CASE_STATUS_LABEL } from "@/lib/cases/caseStatus";

import { CaseCountCards } from "./CaseCountCards";

const COUNTS = { draft: 3, in_review: 2, needs_revision: 0, approved: 5 };

describe("CaseCountCards", () => {
  // Positive, AC1
  it("shows one card per status with its count", () => {
    render(<CaseCountCards counts={COUNTS} total={10} />);

    const cards = screen.getAllByRole("listitem");

    expect(cards).toHaveLength(4);
    expect(within(cards[1]).getByText("2")).toBeInTheDocument();
  });

  // AC1: urutannya mengikuti alur kasus, bukan abjad.
  it("keeps the cards in the order a case moves through", () => {
    render(<CaseCountCards counts={COUNTS} total={10} />);

    const labels = screen
      .getAllByRole("listitem")
      .map((card) => card.textContent);

    expect(labels[0]).toContain(CASE_STATUS_LABEL.draft);
    expect(labels[1]).toContain(CASE_STATUS_LABEL.in_review);
    expect(labels[2]).toContain(CASE_STATUS_LABEL.needs_revision);
    expect(labels[3]).toContain(CASE_STATUS_LABEL.approved);
  });

  // Corner: status kosong tetap muncul sebagai nol, bukan hilang.
  it("shows a zero instead of dropping the card", () => {
    render(<CaseCountCards counts={COUNTS} total={10} />);

    expect(within(screen.getAllByRole("listitem")[2]).getByText("0")).toBeInTheDocument();
  });

  // Positive
  it("shows how many cases there are in total", () => {
    render(<CaseCountCards counts={COUNTS} total={10} />);

    expect(screen.getByText(/10 kasus/)).toBeInTheDocument();
  });
});