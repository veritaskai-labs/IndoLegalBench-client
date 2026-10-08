import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAuditLogs } from "@/lib/audit/auditApi";
import type { AuditEntry, AuditPage } from "@/types/audit";
import { CaseAuditHistory } from "./CaseAuditHistory";

vi.mock("@/lib/audit/auditApi", () => ({ listAuditLogs: vi.fn() }));
const list = vi.mocked(listAuditLogs);

function entry(overrides: Partial<AuditEntry> = {}): AuditEntry {
  return {
    id: 1,
    occurred_at: "2026-10-06T03:30:00Z",
    actor_user_id: "u1",
    actor_name: "Herdayani",
    actor_role: "author",
    action: "case.updated",
    entity_type: "case",
    entity_id: "c9",
    case_id: "c9",
    before: null,
    after: null,
    reason: null,
    request_id: null,
    ...overrides,
  };
}

function page(items: AuditEntry[]): AuditPage {
  return { items, total: items.length, page: 1, size: 20 };
}

beforeEach(() => {
  list.mockReset();
});

describe("CaseAuditHistory", () => {
  // AC5: Reviewer hanya melihat catatan kasus yang sedang ia review.
  it("asks only for the case it was given", async () => {
    list.mockResolvedValue(page([]));

    render(<CaseAuditHistory caseId="c9" />);

    await screen.findByText(/Belum ada perubahan tercatat/);
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ case_id: "c9" }));
  });

  // Positive
  it("lists what it received", async () => {
    list.mockResolvedValue(page([entry()]));

    render(<CaseAuditHistory caseId="c9" />);

    expect(await screen.findByText("case.updated")).toBeInTheDocument();
  });

  // Corner
  it("says there is nothing yet when the case has no record", async () => {
    list.mockResolvedValue(page([]));

    render(<CaseAuditHistory caseId="c9" />);

    expect(await screen.findByText(/Belum ada perubahan tercatat/)).toBeInTheDocument();
  });

  // Negative
  it("explains a 403 instead of offering a pointless retry", async () => {
    list.mockRejectedValue(Object.assign(new Error("forbidden"), { status: 403 }));

    render(<CaseAuditHistory caseId="c9" />);

    expect(await screen.findByText(/tidak ditugaskan/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /coba lagi/i })).toBeNull();
  });

  // Negative
  it("offers a retry on an ordinary failure", async () => {
    list.mockRejectedValue(new Error("boom"));

    render(<CaseAuditHistory caseId="c9" />);

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /coba lagi/i })).toBeInTheDocument();
  });
});