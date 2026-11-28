import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import type { CaseDirectoryRow } from "@/lib/cases/caseDirectory";
import { DuplicateCaseDialog, duplicateErrorMessage } from "./DuplicateCaseDialog";

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

describe("duplicateErrorMessage", () => {
  it("says an archived suite blocks duplication in English", () => {
    expect(duplicateErrorMessage(new ApiError(422, "SUITE_NOT_ACTIVE"), "en")).toBe(
      "This case's suite is archived. Activate the suite to duplicate the case.",
    );
  });
});

describe("DuplicateCaseDialog", () => {
  it("asks to duplicate in English and keeps the case code", () => {
    render(
      <LocaleProvider locale="en">
        <DuplicateCaseDialog row={row} onClose={vi.fn()} onDone={vi.fn()} />
      </LocaleProvider>,
    );
    expect(screen.getByRole("dialog", { name: "Duplicate case" })).toBeInTheDocument();
    expect(screen.getByText("KAS-01")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Duplicate" })).toBeInTheDocument();
  });
});
