import { render, screen, within } from "@testing-library/react";
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

// PBI-24 AC6: the same cards also show the contributor's own cases, under their own title.
describe("CaseCountCards, own cases", () => {
  const ZERO = { draft: 0, in_review: 0, needs_revision: 0, approved: 0 };

  // Positive
  it("shows the given title instead of the team one", () => {
    // Arrange / Act
    render(<CaseCountCards title="Kasus Anda" counts={COUNTS} total={10} />);

    // Assert
    expect(screen.getByRole("heading", { name: "Kasus Anda" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Ringkasan kasus" })).not.toBeInTheDocument();
  });

  it("leaves out the waiting-for-review card when no waiting count is given", () => {
    render(<CaseCountCards title="Kasus Anda" counts={COUNTS} total={10} />);

    expect(screen.getAllByRole("listitem")).toHaveLength(4);
    expect(screen.queryByText("Menunggu review")).not.toBeInTheDocument();
  });

  // Edge: two sections on one page must each be labelled by their own heading.
  it("labels each section by its own heading when two are on the page", () => {
    render(
      <>
        <CaseCountCards title="Kasus Anda" counts={COUNTS} total={10} />
        <CaseCountCards counts={COUNTS} total={20} waiting={2} />
      </>,
    );

    const own = screen.getByRole("region", { name: "Kasus Anda" });
    const team = screen.getByRole("region", { name: "Ringkasan kasus" });

    expect(within(own).getByText("Total 10 kasus")).toBeInTheDocument();
    expect(within(team).getByText("Total 20 kasus")).toBeInTheDocument();
  });

  // Edge: nothing written yet is said in words, next to the zeros.
  it("says so in words when there are no cases at all", () => {
    render(<CaseCountCards title="Kasus Anda" counts={ZERO} total={0} emptyNote="Anda belum menulis kasus." />);

    expect(screen.getByText("Anda belum menulis kasus.")).toBeInTheDocument();
    expect(screen.getAllByText("0")).toHaveLength(4);
  });

  // Negative: the note is only for an empty list.
  it("does not show the note when there are cases", () => {
    render(<CaseCountCards title="Kasus Anda" counts={COUNTS} total={10} emptyNote="Anda belum menulis kasus." />);

    expect(screen.queryByText("Anda belum menulis kasus.")).not.toBeInTheDocument();
  });
});
