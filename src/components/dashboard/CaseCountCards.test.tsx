import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { CASE_STATUS_LABEL } from "@/lib/cases/caseStatus";
import { CaseCountCards } from "./CaseCountCards";

const COUNTS = { draft: 3, in_review: 2, needs_revision: 0, approved: 5 };

describe("CaseCountCards", () => {
  // Positive, AC1
  it("shows one card per status with its count", () => {
    render(<CaseCountCards counts={COUNTS} total={10} waiting={2} />);

    const cards = screen.getAllByRole("listitem");

    expect(cards).toHaveLength(5);
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  // AC1: urutannya mengikuti alur kasus, bukan abjad.
  it("keeps the cards in the order a case moves through", () => {
    render(<CaseCountCards counts={COUNTS} total={10} waiting={2} />);

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
    render(<CaseCountCards counts={COUNTS} total={10} waiting={2} />);

    expect(screen.getAllByRole("listitem")[2]).toHaveTextContent("0");
  });

  // Positive
  it("shows how many cases there are in total", () => {
    render(<CaseCountCards counts={COUNTS} total={10} waiting={2} />);

    expect(screen.getByText(/10 kasus/)).toBeInTheDocument();
  });

  // AC1: jumlah kasus yang menunggu review adalah angka tersendiri.
  it("shows how many cases are waiting for a review", () => {
    render(<CaseCountCards counts={COUNTS} total={10} waiting={7} />);

    const waiting = screen.getAllByRole("listitem")[4];

    expect(waiting).toHaveTextContent("Menunggu review");
    expect(waiting).toHaveTextContent("7");
  });

  // Corner: angkanya memang bisa beda dari "Dalam tinjauan", jadi harus dijelaskan.
  it("explains why it can differ from the in-review count", () => {
    render(<CaseCountCards counts={COUNTS} total={10} waiting={7} />);

    expect(
      screen.getByText(/bisa lebih besar dari "Dalam tinjauan"/),
    ).toBeInTheDocument();
  });
});