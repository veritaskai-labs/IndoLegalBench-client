import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { gradingResponse, gradingRunSummary } from "@/test/gradingFixtures";
import { GradingHistoryList } from "./GradingHistoryList";

function rows() {
  return within(screen.getByRole("table", { name: "Riwayat penilaian" })).getAllByRole("row").slice(1);
}

function cells(row: HTMLElement) {
  return within(row).getAllByRole("cell");
}

describe("GradingHistoryList (AC7 old results stay, SCRUM-375 C5 labelled table)", () => {
  // Positive (C5): every fact has its own labelled column instead of seven unlabelled pieces in one line.
  it("labels every column", () => {
    // Act
    render(<GradingHistoryList runs={[gradingResponse()]} />);

    // Assert
    const headers = within(screen.getByRole("table", { name: "Riwayat penilaian" }))
      .getAllByRole("columnheader")
      .map((header) => header.textContent);
    expect(headers).toEqual(["Penilaian", "Versi rubrik", "Penilai LLM", "Status", "Dinilai", "Biaya"]);
  });

  // Positive: what one run tells the Admin, column by column.
  it("shows number, kind, rubric version, judge, status, time and cost of a run", () => {
    // Arrange
    const runs = [
      gradingRunSummary({
        triggered_at: "2026-11-06T03:05:00Z",
        judge: { judge_provider_id: "judge-a", name: "DeepSeek", model_version: "deepseek-chat", cost_idr: "1166.00" },
      }),
    ];

    // Act
    render(<GradingHistoryList runs={runs} />);

    // Assert
    const [row] = rows();
    const [run, version, judge, status, time, cost] = cells(row);
    expect(run).toHaveTextContent("Penilaian 1");
    expect(run).toHaveTextContent("Nilai pertama");
    expect(version).toHaveTextContent("Versi 1");
    expect(judge).toHaveTextContent("DeepSeek · deepseek-chat");
    expect(status).toHaveTextContent("Selesai");
    expect(time).toHaveTextContent("06 Nov 2026, 10.05 WIB");
    // Intl puts a no-break space after "Rp".
    expect(cost.textContent?.replace(/\s/g, " ")).toBe("Rp 1.166");
  });

  // Edge: number by age, newest on top; edge because the list is sorted newest first, so the top row has the highest number.
  it("lists the newest run first, numbered by age, and marks only it as Terbaru", () => {
    // Arrange
    const runs = [
      gradingResponse({ grading_run_id: "r-1", is_latest: false, triggered_at: "2026-11-01T03:00:00Z" }),
      gradingResponse({ grading_run_id: "r-2", kind: "regrade", rubric_version: "v2", triggered_at: "2026-11-06T03:00:00Z" }),
    ];

    // Act
    render(<GradingHistoryList runs={runs} />);

    // Assert
    const [newer, older] = rows();
    expect(cells(newer)[0]).toHaveTextContent("Penilaian 2");
    expect(cells(newer)[0]).toHaveTextContent("Nilai ulang");
    expect(within(newer).getByText("Terbaru")).toBeInTheDocument();
    expect(cells(older)[0]).toHaveTextContent("Penilaian 1");
    expect(within(older).queryByText("Terbaru")).not.toBeInTheDocument();
  });

  // Edge: no recorded cost; edge because failed judge calls have no price, and an empty cell would look like a bug.
  it("shows a dash when no cost was recorded", () => {
    // Act
    render(<GradingHistoryList runs={[gradingRunSummary({ judge: null })]} />);

    // Assert
    expect(cells(rows()[0])[5]).toHaveTextContent(/^-$/);
  });

  // Negative: a run that did not finish is not shown green; edge because status is a free string from the server.
  it("shows an unfinished run's status in grey, not green", () => {
    // Act
    render(<GradingHistoryList runs={[gradingResponse({ status: "failed" })]} />);

    // Assert
    expect(cells(rows()[0])[3].querySelector("span")).not.toHaveClass("bg-success-wash");
  });

  // Positive (C5): on the phone each run is a card with the same facts.
  it("offers the runs as cards for the phone", () => {
    // Act
    render(<GradingHistoryList runs={[gradingResponse()]} />);

    // Assert
    const [card] = within(screen.getByRole("list", { name: "Riwayat penilaian" })).getAllByRole("listitem");
    expect(card).toHaveTextContent("Penilaian 1");
    expect(card).toHaveTextContent("Versi 1");
  });

  // Negative: a session that was never graded has no result, and the section says so.
  it("shows a plain message and no table when there are no runs", () => {
    // Act
    render(<GradingHistoryList runs={[]} />);

    // Assert
    expect(screen.getByText("Belum ada hasil penilaian untuk sesi ini.")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  // Positive: the note under the table says that a regrade adds a row and where the scores come from.
  it("explains that a regrade adds a row and that the scores come from Terbaru", () => {
    // Act
    render(<GradingHistoryList runs={[gradingResponse()]} />);

    // Assert
    expect(
      screen.getByText("Setiap Nilai ulang menambah baris baru di atas. Skor di halaman ini selalu dari baris Terbaru."),
    ).toBeInTheDocument();
  });
});

describe("GradingHistoryList choosing a run (K-17/K-18, SCRUM-283)", () => {
  const RUNS = [
    gradingRunSummary({ grading_run_id: "run-2", kind: "regrade", triggered_at: "2026-11-07T05:00:00Z" }),
    gradingRunSummary({ grading_run_id: "run-1", is_latest: false, triggered_at: "2026-11-07T03:00:00Z" }),
  ];

  // Positive: an older run can be opened from the table.
  it("tells the page which run was chosen", async () => {
    // Arrange
    const onSelect = vi.fn();
    render(<GradingHistoryList runs={RUNS} selectedId="run-2" onSelect={onSelect} />);
    const [, older] = rows();

    // Act
    await userEvent.setup().click(within(older).getByRole("button", { name: /Penilaian 1/ }));

    // Assert
    expect(onSelect).toHaveBeenCalledWith("run-1");
  });

  // Positive: the run shown below is marked, so the Admin knows what the scores belong to.
  it("marks the run that is shown", () => {
    // Act
    render(<GradingHistoryList runs={RUNS} selectedId="run-1" onSelect={vi.fn()} />);

    // Assert
    const [newer, older] = rows();
    expect(within(older).getByRole("button")).toHaveAttribute("aria-pressed", "true");
    expect(within(newer).getByRole("button")).toHaveAttribute("aria-pressed", "false");
  });

  // Edge: when runs can be chosen, the note must not claim the scores always come from Terbaru.
  it("says how to open another run instead of claiming the scores are always the latest", () => {
    // Act
    render(<GradingHistoryList runs={RUNS} selectedId="run-2" onSelect={vi.fn()} />);

    // Assert
    expect(
      screen.getByText("Setiap Nilai ulang menambah baris baru di atas. Pilih Penilaian untuk melihat skornya; tanpa pilihan, skor dari baris Terbaru."),
    ).toBeInTheDocument();
  });

  // Negative: without onSelect the table is read only, as before.
  it("has no buttons when nothing can be chosen", () => {
    // Act
    render(<GradingHistoryList runs={RUNS} />);

    // Assert
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
