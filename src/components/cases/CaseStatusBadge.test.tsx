import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
import { CaseStatusBadge } from "./CaseStatusBadge";

describe("CaseStatusBadge", () => {
  // Positive: satu badge untuk seluruh aplikasi, warnanya ikut status.
  it("shows a draft in slate", () => {
    render(<CaseStatusBadge status="draft" />);
    expect(screen.getByText("Draft")).toHaveClass("bg-slate-100");
  });

  it("shows a case in review in amber", () => {
    render(<CaseStatusBadge status="in_review" />);
    expect(screen.getByText("Dalam tinjauan")).toHaveClass("bg-amber-50");
  });

  it("shows a case that needs revision in rose", () => {
    render(<CaseStatusBadge status="needs_revision" />);
    expect(screen.getByText("Perlu revisi")).toHaveClass("bg-rose-50");
  });

  it("shows an approved case in emerald", () => {
    render(<CaseStatusBadge status="approved" />);
    expect(screen.getByText("Disetujui")).toHaveClass("bg-emerald-50");
  });

  it("names the status in English when that language is on screen", () => {
    render(
      <LocaleProvider locale="en">
        <CaseStatusBadge status="in_review" />
      </LocaleProvider>,
    );
    expect(screen.getByText("In review")).toHaveClass("bg-amber-50");
  });
});