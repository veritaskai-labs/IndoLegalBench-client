import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import type { CaseDirectoryRow } from "@/lib/cases/caseDirectory";
import { CasePreviewDrawer } from "./CasePreviewDrawer";

vi.mock("@/hooks/useCaseDetail", () => ({
  useCaseDetail: () => ({
    status: "ready",
    saved: {
      case_code: "KAS-01",
      version: 2,
      status: "draft",
      split_tag: "dev",
      was_dev: false,
      identity: { title: "Sengketa sewa", question: "Apa akibatnya?", category: null },
      legal_refs: [],
      answer_criteria: {},
      suite_id: "suite-1",
    },
  }),
}));

const row: CaseDirectoryRow = {
  id: "case-1",
  case_code: "KAS-01",
  title: "Sengketa sewa",
  split_tag: "dev",
  origin: "manual",
  masked: false,
  status: "draft",
  completeness_pct: 40,
  updated_at: "2026-11-20T00:00:00Z",
  suite_id: "suite-1",
  suite_name: "Perdata",
  suite_archived: false,
};

describe("CasePreviewDrawer", () => {
  it("names the preview in English and keeps the case title", () => {
    render(
      <LocaleProvider locale="en">
        <CasePreviewDrawer row={row} onClose={vi.fn()} />
      </LocaleProvider>,
    );
    expect(screen.getByRole("heading", { name: "Case preview" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sengketa sewa" })).toBeInTheDocument();
    expect(screen.getByText("Perdata")).toBeInTheDocument();
  });
});
