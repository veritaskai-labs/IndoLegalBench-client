import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import {
  listNeedsReassignment,
  replaceReviewer,
} from "@/lib/reviews/reviewApi";
import { listActiveUsers } from "@/lib/userApi";
import AdminReviewsPage from "./page";
import type {
  ReassignmentAssignment,
  ReassignmentRow,
  ReplacedAssignment,
} from "@/types/reviewAdmin";
import type { User } from "@/types/user-management";
import { listInReviewCases } from "@/lib/reviews/inReviewApi";
import type { InReviewRow } from "@/lib/reviews/inReviewApi";
import { listCaseVersions } from "@/lib/cases/versionApi";
import { makeSummary } from "@/test/versionFixtures";

vi.mock("@/lib/reviews/reviewApi", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/reviews/reviewApi")>();
  return { ...actual, listNeedsReassignment: vi.fn(), replaceReviewer: vi.fn() };
});
vi.mock("@/lib/userApi", () => ({ listActiveUsers: vi.fn() }));
vi.mock("@/lib/reviews/inReviewApi", () => ({ listInReviewCases: vi.fn() }));
vi.mock("@/lib/cases/versionApi", () => ({ listCaseVersions: vi.fn() }));



const inReviewMock = vi.mocked(listInReviewCases);

const IN_REVIEW: InReviewRow = {
  case: {
    id: "c1",
    case_code: "ILB-PT-0142",
    title: "Sengketa tanah warisan",
    split_tag: "dev",
    status: "in_review",
    completeness_pct: 100,
    updated_at: "2026-10-16T03:00:00Z",
  },
  review: {
    case_id: "c1",
    case_version_id: "v1",
    round_no: 1,
    status: "open",
    decision: null,
    opened_at: "2026-10-16T03:00:00Z",
    decided_at: null,
    reviewers: [
      {
        assignment_id: "a1",
        reviewer: { id: "u1", name: "Roben" },
        status: "active",
        verdict: {
          decision: "approve",
          comment: "Sudah lengkap.",
          submitted_at: "2026-10-16T04:00:00Z",
        },
      },
    ],
  },
};

const queueMock = vi.mocked(listNeedsReassignment);
const replaceMock = vi.mocked(replaceReviewer);
const usersMock = vi.mocked(listActiveUsers);

function assignment(
  overrides: Partial<ReassignmentAssignment> = {},
): ReassignmentAssignment {
  return {
    id: "a1",
    reviewer_id: "u1",
    reviewer_name: "Roben",
    status: "active",
    source: "system",
    assigned_at: "2026-10-16T03:00:00Z",
    ended_at: null,
    end_reason: null,
    ...overrides,
  };
}

function row(overrides: Partial<ReassignmentRow> = {}): ReassignmentRow {
  return {
    case_id: "c1",
    case_code: "ILB-PT-0142",
    case_title: "Sengketa tanah warisan",
    round_id: "r1",
    round_no: 1,
    round_status: "open",
    active_reviewers_count: 0,
    void_assignments: [],
    assignments: [],
    ...overrides,
  };
}

const ROBEN: User = {
  id: "u1",
  name: "Roben",
  email: "roben@example.com",
  role: "reviewer",
  is_active: true,
};

const AILEEN: User = {
  id: "u9",
  name: "Aileen",
  email: "aileen@example.com",
  role: "reviewer",
  is_active: true,
};

const versionsMock = vi.mocked(listCaseVersions);

const ESI: User = {
  id: "u5",
  name: "Esi",
  email: "esi@example.com",
  role: "reviewer",
  is_active: true,
};

const REPLACED: ReplacedAssignment = {
  id: "asg-baru",
  review_round_id: "round-1",
  reviewer_id: "rev-2",
  source: "admin",                       
  assigned_at: "2026-10-18T02:00:00Z",   
  status: "active",
  replaced_assignment_id: "asg-1",
};

beforeEach(() => {
    
  queueMock.mockReset();
  replaceMock.mockReset();
  usersMock.mockReset();
  usersMock.mockResolvedValue([ROBEN, AILEEN]);
  inReviewMock.mockReset();
  inReviewMock.mockResolvedValue([]);
  versionsMock.mockReset();
  versionsMock.mockResolvedValue([]);

});

describe("AdminReviewsPage (SCRUM-150)", () => {
  // Positif
  it("waits while the queue is loading", () => {
    queueMock.mockReturnValue(new Promise(() => undefined));

    render(<AdminReviewsPage />);

    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  // Positif
  it("lists the queued case", async () => {
    queueMock.mockResolvedValue([
      row({ void_assignments: [assignment({ status: "void" })] }),
    ]);

    render(<AdminReviewsPage />);

    expect(await screen.findByText("ILB-PT-0142")).toBeInTheDocument();
    expect(screen.getByText("Reviewer dinonaktifkan")).toBeInTheDocument();
  });

  // Sudut
  it("says so when nothing needs a reviewer", async () => {
    queueMock.mockResolvedValue([]);

    render(<AdminReviewsPage />);

    expect(
      await screen.findByText("Tidak ada kasus yang perlu penugasan ulang"),
    ).toBeInTheDocument();
  });

  // Negatif
  it("shows the message when the server refuses", async () => {
    const failure = Promise.reject(new ApiError(403, "FORBIDDEN"));
    failure.catch(() => undefined);
    queueMock.mockReturnValue(failure);

    render(<AdminReviewsPage />);

    expect(
      await screen.findByText(
        "Hanya Admin yang boleh membuka pemantauan review.",
      ),
    ).toBeInTheDocument();
  });

  // Positif
  it("replaces the reviewer and reloads the queue", async () => {
    const user = userEvent.setup();
    const active = assignment({ id: "a1", reviewer_id: "u1" });
    queueMock.mockResolvedValue([row({ assignments: [active] })]);
    replaceMock.mockResolvedValue(REPLACED);

    render(<AdminReviewsPage />);

    await user.click(
      await screen.findByRole("button", { name: "Ganti reviewer Roben" }),
    );
    await user.selectOptions(screen.getByLabelText("Reviewer baru"), "u9");
    await user.type(
      screen.getByLabelText("Alasan penggantian"),
      "Reviewer cuti",
    );
    await user.click(screen.getByRole("button", { name: "Lanjut" }));
    await user.click(screen.getByRole("button", { name: "Ya, ganti reviewer" }));

    expect(replaceMock).toHaveBeenCalledWith("a1", {
      new_reviewer_id: "u9",
      reason: "Reviewer cuti",
    });
    await waitFor(() => expect(queueMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

// Positif
  it("lists the cases in review on the second tab", async () => {
    const user = userEvent.setup();
    queueMock.mockResolvedValue([]);
    inReviewMock.mockResolvedValue([IN_REVIEW]);

    render(<AdminReviewsPage />);
    await user.click(screen.getByRole("tab", { name: "Dalam review" }));

    expect(await screen.findByText("ILB-PT-0142")).toBeInTheDocument();
    expect(screen.getByText("Roben")).toBeInTheDocument();
    expect(screen.getByText("Setuju")).toBeInTheDocument();
    expect(screen.getByText("Sudah lengkap.")).toBeInTheDocument();
  });

  // corner
  it("says so when nothing is in review", async () => {
    const user = userEvent.setup();
    queueMock.mockResolvedValue([]);
    inReviewMock.mockResolvedValue([]);

    render(<AdminReviewsPage />);
    await user.click(screen.getByRole("tab", { name: "Dalam review" }));

    expect(
      await screen.findByText("Tidak ada kasus yang sedang direview"),
    ).toBeInTheDocument();
  });

  // Negatif
  it("shows the message when the review list fails", async () => {
    const user = userEvent.setup();
    queueMock.mockResolvedValue([]);
    const failure = Promise.reject(new Error("offline"));
    failure.catch(() => undefined);
    inReviewMock.mockReturnValue(failure);

    render(<AdminReviewsPage />);
    await user.click(screen.getByRole("tab", { name: "Dalam review" }));

    expect(
      await screen.findByText(
        "Gagal memuat kasus yang sedang direview. Coba lagi.",
      ),
    ).toBeInTheDocument();
  });

    // Negatif
  it("leaves the case author out of the candidates", async () => {
    const user = userEvent.setup();
    const active = assignment({ id: "a1", reviewer_id: "u1" });
    queueMock.mockResolvedValue([row({ assignments: [active] })]);
    usersMock.mockResolvedValue([ROBEN, AILEEN, ESI]);
    versionsMock.mockResolvedValue([
      makeSummary(1, { author: { id: "u5", name: "Esi" } }),
    ]);

    render(<AdminReviewsPage />);
    await user.click(
      await screen.findByRole("button", { name: "Ganti reviewer Roben" }),
    );

    expect(
      await screen.findByRole("option", { name: "Aileen" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("option", { name: "Esi" })).not.toBeInTheDocument(),
    );
  });
  
});