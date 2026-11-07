import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { gradedAttempt, gradedCase } from "@/test/gradingFixtures";
import type { CaseGradeResult } from "@/types/grading";
import { SessionScoreTable } from "./SessionScoreTable";

function renderTable(cases: CaseGradeResult[], rubricVersion = "v1") {
  render(<SessionScoreTable cases={cases} rubricVersion={rubricVersion} />);
  return screen.getByRole("table", { name: "Skor per kasus" });
}

const twoCases = [
  gradedCase({
    snapshot_item_id: "item-1",
    case_code: "KC-001",
    title: "Kasus contoh A",
    scores: { deterministic: "0.67", quality: "0.60", format: "0.50" },
    attempts: [
      gradedAttempt({ attempt_id: "a-2", repetition_no: 2, score: { deterministic: "0.33", quality: "0.40", format: "0.25" } }),
      gradedAttempt({ attempt_id: "a-1", repetition_no: 1, score: { deterministic: "1.00", quality: "0.80", format: "0.75" } }),
    ],
  }),
  gradedCase({ snapshot_item_id: "item-2", case_code: "KC-002", title: "Kasus contoh B", split_tag: "test" }),
];

describe("SessionScoreTable (PBI-14 AC3, AC8)", () => {
  // server#114 bff8755: the deterministic path, then the judge's quality and format scores.
  it("has a column for the deterministic path and for each judge aspect", () => {
    const table = renderTable(twoCases);

    expect(within(table).getAllByRole("columnheader").map((cell) => cell.textContent)).toEqual([
      "Kasus",
      "Split",
      "Deterministik",
      "Kualitas LLM",
      "Format LLM",
    ]);
  });

  it("shows one row per case with every average score", () => {
    const table = renderTable(twoCases);

    const row = within(table).getByRole("row", { name: /KC-001/ });
    expect(row).toHaveTextContent("Kasus contoh A");
    expect(within(row).getAllByRole("cell").slice(2).map((cell) => cell.textContent)).toEqual(["0,67", "0,60", "0,50"]);
    expect(within(table).getByRole("row", { name: /KC-002/ })).toHaveTextContent("Kasus contoh B");
  });

  it("never shows a percent or an X dari N count", () => {
    const table = renderTable(twoCases);

    expect(table.textContent).not.toMatch(/%| dari /);
  });

  // AC8: a click on the row shows the attempts and the rubric version of this result.
  it("opens a case to show its attempts and the rubric version", async () => {
    const user = userEvent.setup();
    renderTable(twoCases);
    const toggle = screen.getByRole("button", { name: /KC-001/ });

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Rincian KC-001" })).not.toBeInTheDocument();
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const detail = screen.getByRole("region", { name: "Rincian KC-001" });
    expect(detail.closest("td")).toHaveAttribute("colspan", "5");
    expect(detail).toHaveTextContent("Versi rubrik: v1");
    const attempts = within(detail).getAllByRole("listitem");
    expect(attempts.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Percobaan 1"),
      expect.stringContaining("Percobaan 2"),
    ]);
    expect(attempts[0]).toHaveTextContent("Berhasil");
    expect(attempts[0]).toHaveTextContent("Deterministik 1,00");
    expect(attempts[0]).toHaveTextContent("Kualitas LLM 0,80");
    expect(attempts[0]).toHaveTextContent("Format LLM 0,75");
  });

  it("closes an open case on a second click", async () => {
    const user = userEvent.setup();
    renderTable(twoCases);
    const toggle = screen.getByRole("button", { name: /KC-001/ });

    await user.click(toggle);
    await user.click(toggle);

    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region", { name: "Rincian KC-001" })).not.toBeInTheDocument();
  });

  // Keyboard users open a case the same way.
  it("opens a case with the keyboard", async () => {
    const user = userEvent.setup();
    renderTable(twoCases);

    await user.tab();
    expect(screen.getByRole("button", { name: /KC-001/ })).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("region", { name: "Rincian KC-001" })).toBeInTheDocument();
  });

  // AC4: a technical disruption is shown as not graded instead of a low score.
  it("marks a disrupted attempt as not graded", async () => {
    const user = userEvent.setup();
    renderTable([
      gradedCase({ attempts: [gradedAttempt({ status: "technical_failure", is_technical_disruption: true, score: null })] }),
    ]);

    await user.click(screen.getByRole("button", { name: /KC-001/ }));

    const attempt = within(screen.getByRole("region", { name: "Rincian KC-001" })).getByRole("listitem");
    expect(attempt).toHaveTextContent("Gagal teknis");
    expect(attempt).toHaveTextContent("Tidak dinilai: gangguan teknis");
  });

  // Edge: a case can be graded with no attempt rows to list.
  it("says when an opened case has no attempts", async () => {
    const user = userEvent.setup();
    renderTable([gradedCase({ attempts: [] })]);

    await user.click(screen.getByRole("button", { name: /KC-001/ }));

    expect(screen.getByRole("region", { name: "Rincian KC-001" })).toHaveTextContent("Belum ada percobaan.");
  });

  // AC8, server#114: Developer AI sees a test case only through the aggregate score.
  it("shows a masked test case as a closed row without its content", () => {
    const table = renderTable([
      gradedCase({
        snapshot_item_id: "item-9",
        masked: true,
        split_tag: "test",
        case_code: "KC-777",
        title: "Judul asli kasus test",
        scores: { deterministic: "0.91", quality: "0.92", format: "0.93" },
      }),
    ]);

    const row = within(table).getByRole("row", { name: /Kasus test disamarkan/ });
    expect(within(row).queryByRole("button")).not.toBeInTheDocument();
    expect(table).not.toHaveTextContent("KC-777");
    expect(table).not.toHaveTextContent("Judul asli");
    expect(table).not.toHaveTextContent("0,92");
  });

  it("says so when no case has been graded", () => {
    const table = renderTable([]);

    expect(table).toHaveTextContent("Belum ada kasus yang dinilai.");
    expect(within(table).getByText("Belum ada kasus yang dinilai.").closest("td")).toHaveAttribute("colspan", "5");
  });
});
