import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { ManualAnswerGateway } from "@/lib/runs/manualAnswersApi";
import type { ManualAnswerResponse, ManualCaseProgress } from "@/types/measurement";
import { ManualCaseCard } from "./ManualCaseCard";

const RESPONSE = { attempt_id: "att-1" } as ManualAnswerResponse;
const QUESTION = "Apakah pemutusan hubungan kerja sepihak sah menurut UU Ketenagakerjaan?";

function createMockCase(overrides: Partial<ManualCaseProgress> = {}): ManualCaseProgress {
  return {
    snapshot_item_id: "snap-1",
    case_id: "case-1",
    case_code: "KASUS-001",
    title: "Sengketa Kontrak Kerja",
    question: QUESTION,
    split_tag: "dev",
    filled: false,
    attempts: [
      {
        attempt_id: "att-1",
        repetition_no: 1,
        filled: false,
        answered_at_platform: null,
        source: "manual",
        platform_refused: false,
        evidence_count: null,
      },
      {
        attempt_id: "att-2",
        repetition_no: 2,
        filled: true,
        answer_md: "Isi",
        answered_at_platform: "2026-11-07T11:00:00Z",
        source: "manual",
        platform_refused: false,
        evidence_count: null,
      },
    ],
    ...overrides,
  };
}

function setup(props: { caseItem?: ManualCaseProgress; canEdit?: boolean } = {}) {
  const saveAnswer = vi.fn().mockResolvedValue(RESPONSE);
  const gateway = {
    saveAnswer,
    getHistory: vi.fn().mockResolvedValue([]),
    listEvidence: vi.fn().mockResolvedValue([]),
  } as unknown as ManualAnswerGateway;
  const onSaved = vi.fn();
  const onDirtyChange = vi.fn();
  render(
    <ManualCaseCard
      caseItem={props.caseItem ?? createMockCase()}
      sessionId="sesi-1"
      gateway={gateway}
      canEdit={props.canEdit ?? true}
      currentUserId="u-1"
      onSaved={onSaved}
      onDirtyChange={onDirtyChange}
    />,
  );
  return { saveAnswer, onSaved, onDirtyChange };
}

describe("ManualCaseCard (PBI-22 AC3, AC4, AC8)", () => {
  // Positive: case identity, status and the question (unchanged from SCRUM-235).
  it("renders case information, tags and the question", () => {
    // Arrange / Act
    setup();

    // Assert
    expect(screen.getByText("KASUS-001")).toBeInTheDocument();
    expect(screen.getByText("dev")).toBeInTheDocument();
    expect(screen.getByText("Sengketa Kontrak Kerja")).toBeInTheDocument();
    expect(screen.getByText("Belum terisi")).toBeInTheDocument();
    expect(screen.getByText(QUESTION)).toBeInTheDocument();
  });

  it("shows 'Sudah terisi' badge when case is completely filled", () => {
    // Arrange / Act
    setup({ caseItem: createMockCase({ filled: true }) });

    // Assert
    expect(screen.getByText("Sudah terisi")).toBeInTheDocument();
  });

  // Positive: AC4 one answer box per attempt, in order.
  it("shows one answer box per attempt", () => {
    // Arrange / Act
    setup();

    // Assert
    const groups = screen.getAllByRole("group", { name: /^Percobaan \d$/ });
    expect(groups.map((group) => group.getAttribute("aria-label"))).toEqual(["Percobaan 1", "Percobaan 2"]);
  });

  // Positive: AC3 the copy button of this case, and no other copy action.
  it("offers the copy question button of this case only", () => {
    // Arrange / Act
    setup();

    // Assert
    expect(screen.getByRole("button", { name: "Salin pertanyaan KASUS-001" })).toBeInTheDocument();
    expect(screen.queryByText(/salin semua|salin dan lanjut/i)).not.toBeInTheDocument();
  });

  // Positive: saving in one box tells the page, with the snapshot item of this case.
  it("saves an answer in a box with the snapshot item of this case", async () => {
    // Arrange
    const { saveAnswer, onSaved } = setup();
    const first = screen.getByRole("group", { name: "Percobaan 1" });
    fireEvent.change(within(first).getByRole("textbox", { name: "Jawaban Percobaan 1" }), { target: { value: "Jawaban baru" } });

    // Act
    await userEvent.click(within(first).getByRole("button", { name: "Simpan jawaban" }));

    // Assert
    expect(saveAnswer).toHaveBeenCalledWith(
      "sesi-1",
      expect.objectContaining({ snapshot_item_id: "snap-1", attempt_no: 1, answer_md: "Jawaban baru" }),
    );
    await vi.waitFor(() => expect(onSaved).toHaveBeenCalledWith(RESPONSE));
  });

  // Edge: the dirty state of a box reaches the page with the attempt id.
  it("passes the unsaved state of a box up", () => {
    // Arrange
    const { onDirtyChange } = setup();

    // Act
    fireEvent.change(screen.getByRole("textbox", { name: "Jawaban Percobaan 1" }), { target: { value: "x" } });

    // Assert
    expect(onDirtyChange).toHaveBeenCalledWith("att-1", true);
  });

  // Negative: without edit permission there is nothing to save.
  it("has no save buttons without edit permission", () => {
    // Arrange / Act
    setup({ canEdit: false });

    // Assert
    expect(screen.queryByRole("button", { name: "Simpan jawaban" })).not.toBeInTheDocument();
  });

  // Edge: a case without attempts (should not happen) still renders its question.
  it("renders a case that has no attempts", () => {
    // Arrange / Act
    setup({ caseItem: createMockCase({ attempts: [] }) });

    // Assert
    expect(screen.queryByRole("group", { name: /^Percobaan/ })).not.toBeInTheDocument();
    expect(screen.getByText(QUESTION)).toBeInTheDocument();
  });
});
