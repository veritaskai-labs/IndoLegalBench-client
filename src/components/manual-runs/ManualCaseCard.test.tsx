import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ManualCaseCard } from "./ManualCaseCard";
import type { ManualCaseProgress } from "@/types/measurement";

function createMockCase(overrides: Partial<ManualCaseProgress> = {}): ManualCaseProgress {
  return {
    snapshot_item_id: "snap-1",
    case_id: "case-1",
    case_code: "KASUS-001",
    title: "Sengketa Kontrak Kerja",
    question: "Apakah pemutusan hubungan kerja sepihak sah menurut UU Ketenagakerjaan?",
    split_tag: "dev",
    filled: false,
    attempts: [
      {
        attempt_id: "att-1",
        repetition_no: 1,
        filled: false,
        answered_at_platform: null,
      },
      {
        attempt_id: "att-2",
        repetition_no: 2,
        filled: true,
        answered_at_platform: "2026-11-07T11:00:00Z",
      },
    ],
    ...overrides,
  };
}

describe("ManualCaseCard (PBI-22 AC8)", () => {
  it("renders case information, tags and attempts", () => {
    const item = createMockCase();
    render(<ManualCaseCard caseItem={item} />);

    expect(screen.getByText("KASUS-001")).toBeInTheDocument();
    expect(screen.getByText("dev")).toBeInTheDocument();
    expect(screen.getByText("Sengketa Kontrak Kerja")).toBeInTheDocument();
    expect(screen.getByText("Belum terisi")).toBeInTheDocument();
    expect(
      screen.getByText("Apakah pemutusan hubungan kerja sepihak sah menurut UU Ketenagakerjaan?"),
    ).toBeInTheDocument();

    expect(screen.getByText("Percobaan 1")).toBeInTheDocument();
    expect(screen.getByText("Belum diisi")).toBeInTheDocument();
    expect(screen.getByText("Percobaan 2")).toBeInTheDocument();
    expect(screen.getByText("Terisi")).toBeInTheDocument();
  });

  it("shows 'Sudah terisi' badge when case is completely filled", () => {
    const item = createMockCase({ filled: true });
    render(<ManualCaseCard caseItem={item} />);

    expect(screen.getByText("Sudah terisi")).toBeInTheDocument();
  });
});
