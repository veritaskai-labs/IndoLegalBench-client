import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AttemptResult, SessionCaseResult } from "@/types/measurement";

import { SessionCaseCard } from "./SessionCaseCard";

function attempt(overrides: Partial<AttemptResult> = {}): AttemptResult {
  return {
    id: "44444444-4444-4444-4444-444444444444",
    repetition_no: 1,
    status: "succeeded",
    answer_text: "Jawaban mentah",
    model_version: "model-qa-1",
    started_at: "2026-11-12T10:13:00Z",
    finished_at: "2026-11-12T10:13:36Z",
    ...overrides,
  };
}

function caseResult(attempts: AttemptResult[]): SessionCaseResult {
  return {
    snapshot_item_id: "item-1",
    case_id: "case-1",
    case_code: "QA-001",
    title: "Judul kasus sintetis",
    question: "Pertanyaan kasus sintetis",
    split_tag: "dev",
    masked: false,
    version_no: 2,
    sections: null,
    attempts,
  };
}

describe("SessionCaseCard attempts (SCRUM-292)", () => {
  it("lists several attempts in repetition order, all closed, each with its header", () => {
    // Arrange
    const item = caseResult([
      attempt({ id: "c", repetition_no: 3, answer_text: "Jawaban ketiga" }),
      attempt({ id: "a", repetition_no: 1, answer_text: "Jawaban pertama" }),
      attempt({ id: "b", repetition_no: 2, answer_text: "Jawaban kedua" }),
    ]);

    // Act
    render(<SessionCaseCard item={item} sessionLabel="aiyu-auto" />);

    // Assert
    const rows = screen.getAllByRole("listitem", { name: /^Percobaan/ });
    expect(rows.map((row) => row.getAttribute("aria-label"))).toEqual(["Percobaan 1", "Percobaan 2", "Percobaan 3"]);
    for (const row of rows) {
      expect(within(row).getByRole("button", { name: /^Jawaban percobaan/ })).toHaveAttribute("aria-expanded", "false");
      expect(row).toHaveTextContent("aiyu-auto");
      expect(within(row).getByText("36 dtk")).toBeInTheDocument();
    }
    expect(screen.queryByText("Jawaban pertama")).not.toBeInTheDocument();
  });

  it("opens the only attempt of a case with one attempt", () => {
    // Arrange
    const item = caseResult([attempt({ answer_text: "Jawaban tunggal" })]);

    // Act
    render(<SessionCaseCard item={item} sessionLabel="aiyu-auto" />);

    // Assert
    expect(screen.getByRole("button", { name: "Jawaban percobaan 1" })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Jawaban tunggal")).toBeInTheDocument();
  });

  it("renders no attempt rows and no chevron when the case has no attempts", () => {
    // Arrange
    const item = caseResult([]);

    // Act
    render(<SessionCaseCard item={item} sessionLabel="aiyu-auto" />);

    // Assert
    expect(screen.queryByRole("listitem", { name: /^Percobaan/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Jawaban percobaan/ })).not.toBeInTheDocument();
    expect(screen.getByText("Belum ada percobaan")).toBeInTheDocument();
  });

  it("keeps the header of a masked test case visible while its content stays hidden", () => {
    // Arrange
    const item = { ...caseResult([attempt({ answer_text: null }), attempt({ id: "b", repetition_no: 2, answer_text: null })]), masked: true };

    // Act
    render(<SessionCaseCard item={item} sessionLabel="aiyu-auto" />);

    // Assert
    expect(screen.getAllByText("Berhasil")).toHaveLength(2);
    expect(screen.queryByText("Isi kasus test disembunyikan untuk Developer AI.")).not.toBeInTheDocument();
  });
});
