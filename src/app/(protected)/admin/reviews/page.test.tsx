import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
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
  case: { id: "c1", case_code: "ILB-PT-0142", title: "Sengketa tanah warisan" },
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
  newVersion: null,
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
  role: "contributor",
  is_active: true,
};

const AILEEN: User = {
  id: "u9",
  name: "Aileen",
  email: "aileen@example.com",
  role: "contributor",
  is_active: true,
};

const versionsMock = vi.mocked(listCaseVersions);

const ESI: User = {
  id: "u5",
  name: "Esi",
  email: "esi@example.com",
  role: "contributor",
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
      row({
        void_assignments: [
          assignment({ status: "void", void_reason: "deactivated" }),
        ],
      }),
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
    const moved = assignment({ id: "a1", reviewer_id: "u1", status: "void", void_reason: "role_changed" });
    queueMock.mockResolvedValue([row({ void_assignments: [moved] })]);
    replaceMock.mockResolvedValue(REPLACED);

    render(<AdminReviewsPage />);

    await user.click(
      await screen.findByRole("button", { name: "Ganti Roben, reviewer untuk ILB-PT-0142" }),
    );
    await user.selectOptions(screen.getByRole("combobox", { name: "Reviewer baru" }), "u9");
    await user.type(
      screen.getByRole("textbox", { name: "Alasan penggantian" }),
      "Reviewer cuti",
    );
    await user.click(screen.getByRole("button", { name: "Tinjau penggantian" }));
    await user.click(screen.getByRole("button", { name: "Ganti reviewer" }));

    const feedback = await screen.findByRole("status");
    expect(feedback).toHaveTextContent(/ILB-PT-0142.*Aileen/);
    expect(feedback).toHaveProperty("tagName", "OUTPUT");
    expect(feedback).toHaveFocus();
    expect(replaceMock).toHaveBeenCalledWith("a1", {
      new_reviewer_id: "u9",
      reason: "Reviewer cuti",
    });
    await waitFor(() => expect(queueMock).toHaveBeenCalledTimes(2));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

// Positif
  it.each([false, true])("restores the invoking row after Escape (went back: %s)", async (wentBack) => {
    const user = userEvent.setup();
    queueMock.mockResolvedValue([row({ void_assignments: [assignment({ status: "void" })] })]);
    render(<AdminReviewsPage />);
    const trigger = await screen.findByRole("button", { name: /^Ganti Roben/ });
    await user.click(trigger);
    if (wentBack) {
      await user.selectOptions(screen.getByRole("combobox", { name: "Reviewer baru" }), "u9");
      await user.type(screen.getByRole("textbox", { name: "Alasan penggantian" }), "Cuti");
      await user.click(screen.getByRole("button", { name: "Tinjau penggantian" }));
      await user.click(screen.getByRole("button", { name: "Kembali" }));
    }
    fireEvent(screen.getByRole("dialog"), new Event("cancel", { cancelable: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("returns a stale assignment to the refreshed queue and explains the conflict", async () => {
    const user = userEvent.setup();
    queueMock.mockResolvedValueOnce([row({ void_assignments: [assignment({ status: "void" })] })]).mockResolvedValue([]);
    replaceMock.mockRejectedValue(new ApiError(409, "ASSIGNMENT_ALREADY_REPLACED"));
    render(<AdminReviewsPage />);
    await user.click(await screen.findByRole("button", { name: /^Ganti Roben/ }));
    await user.selectOptions(screen.getByRole("combobox", { name: "Reviewer baru" }), "u9");
    await user.type(screen.getByRole("textbox", { name: "Alasan penggantian" }), "Cuti");
    await user.click(screen.getByRole("button", { name: "Tinjau penggantian" }));
    await user.click(screen.getByRole("button", { name: "Ganti reviewer" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Penugasan ini sudah pernah diganti");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(queueMock).toHaveBeenCalledTimes(2);
  });

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
    // PBI-24 AC1: Kontributor replaces Author in every visible text.
    expect(
      screen.getByText(/setelah Kontributor mengajukannya untuk review/),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Author/)).not.toBeInTheDocument();
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
    const moved = assignment({ id: "a1", reviewer_id: "u1", status: "void", void_reason: "role_changed" });
    queueMock.mockResolvedValue([row({ void_assignments: [moved] })]);
    usersMock.mockResolvedValue([ROBEN, AILEEN, ESI]);
    versionsMock.mockResolvedValue([
      makeSummary(1, { author: { id: "u5", name: "Esi" } }),
    ]);

    render(<AdminReviewsPage />);
    await user.click(
      await screen.findByRole("button", { name: "Ganti Roben, reviewer untuk ILB-PT-0142" }),
    );

    expect(
      await screen.findByRole("option", { name: "Aileen" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByRole("option", { name: "Esi" })).not.toBeInTheDocument(),
    );
  });
  it.each([
    { versions: [makeSummary(1, { author: { id: "u5", name: "Esi" } })], eligible: ["Aileen"] },
    { versions: [], eligible: ["Aileen", "Esi"] },
  ])("reuses the completed author lookup when reopening the same case", async ({ versions, eligible }) => {
    const user = userEvent.setup();
    const moved = assignment({ status: "void" });
    queueMock.mockResolvedValue([
      row({ void_assignments: [moved] }),
      row({ case_id: "c2", case_code: "ILB-PT-0256", round_id: "r2", void_assignments: [moved] }),
    ]);
    usersMock.mockResolvedValue([ROBEN, AILEEN, ESI]);
    versionsMock.mockResolvedValue(versions);

    render(<AdminReviewsPage />);
    const first = await screen.findByRole("button", { name: "Ganti Roben, reviewer untuk ILB-PT-0142" });
    await user.click(first);
    await screen.findByRole("option", { name: "Aileen" });
    await user.click(screen.getByRole("button", { name: "Batal" }));
    await user.click(first);

    expect(screen.getByRole("combobox", { name: "Reviewer baru" })).toBeEnabled();
    expect(screen.getAllByRole("option").slice(1).map(option => option.textContent)).toEqual(eligible);
    expect(versionsMock).toHaveBeenCalledExactlyOnceWith("c1");

    await user.click(screen.getByRole("button", { name: "Batal" }));
    await user.click(screen.getByRole("button", { name: "Ganti Roben, reviewer untuk ILB-PT-0256" }));
    await screen.findByRole("option", { name: "Aileen" });
    expect(versionsMock.mock.calls).toEqual([["c1"], ["c2"]]);
  });

  it("shares an in-flight author lookup when the same case is reopened", async () => {
    const user = userEvent.setup();
    const moved = assignment({ status: "void" });
    queueMock.mockResolvedValue([row({ void_assignments: [moved] })]);
    let finish!: (versions: Awaited<ReturnType<typeof listCaseVersions>>) => void;
    versionsMock.mockReturnValue(new Promise(resolve => { finish = resolve; }));

    render(<AdminReviewsPage />);
    const trigger = await screen.findByRole("button", { name: /^Ganti Roben/ });
    await user.click(trigger);
    const loading = screen.getByText("Memuat kandidat reviewer…");
    await user.click(screen.getByRole("button", { name: "Batal" }));
    await user.click(trigger);
    finish([]);

    expect(await screen.findByRole("option", { name: "Aileen" })).toBeInTheDocument();
    expect(versionsMock).toHaveBeenCalledExactlyOnceWith("c1");
    expect(loading).toHaveProperty("tagName", "OUTPUT");
  });

  // Negatif: daftar anggota gagal diambil — pilihan kosong harus ada penjelasannya.
  it("says why the reviewer list is empty when the member list fails", async () => {
    const user = userEvent.setup();
    queueMock.mockResolvedValue([row({ void_assignments: [assignment({ status: "void", void_reason: "role_changed" })] })]);
    const failure = Promise.reject(new Error("offline"));
    failure.catch(() => undefined);
    usersMock.mockReturnValue(failure);

    render(<AdminReviewsPage />);
    await user.click(
      await screen.findByRole("button", { name: "Ganti Roben, reviewer untuk ILB-PT-0142" }),
    );

    expect(
      await screen.findByText(/Daftar reviewer gagal dimuat/),
    ).toBeInTheDocument();
  });

  // Negatif: pencarian penulis gagal — jangan diam-diam berhenti mengecualikan penulis.
  it("says the author could not be checked when the versions call fails", async () => {
    const user = userEvent.setup();
    queueMock.mockResolvedValue([row({ void_assignments: [assignment({ status: "void", void_reason: "role_changed" })] })]);
    versionsMock.mockRejectedValueOnce(new Error("offline"));

    render(<AdminReviewsPage />);
    await user.click(
      await screen.findByRole("button", { name: "Ganti Roben, reviewer untuk ILB-PT-0142" }),
    );

    expect(
      await screen.findByText(/Penulis kasus tidak bisa dicek/),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Batal" }));
    await user.click(screen.getByRole("button", { name: /^Ganti Roben/ }));
    await screen.findByRole("option", { name: "Aileen" });
    expect(screen.queryByText(/Penulis kasus tidak bisa dicek/)).not.toBeInTheDocument();
    expect(versionsMock.mock.calls).toEqual([["c1"], ["c1"]]);
  });
  // AC7: penggantian tidak hanya dari antrean, tapi juga dari kasus yang sedang direview.
  it("keeps the second reviewer's draft on back and restores that action's focus on cancel", async () => {
    const user = userEvent.setup();
    queueMock.mockResolvedValue([]);
    inReviewMock.mockResolvedValue([{
      ...IN_REVIEW,
      review: {
        ...IN_REVIEW.review,
        reviewers: [...IN_REVIEW.review.reviewers, {
          assignment_id: "a2", reviewer: { id: ESI.id, name: ESI.name }, status: "active", verdict: null,
        }],
      },
    }]);

    render(<AdminReviewsPage />);
    await user.click(screen.getByRole("tab", { name: "Dalam review" }));
    const trigger = await screen.findByRole("button", { name: "Ganti Esi, reviewer untuk ILB-PT-0142" });
    await user.click(trigger);

    expect(screen.getByRole("dialog")).toHaveTextContent("Sengketa tanah warisan");
    expect(screen.getByRole("dialog")).toHaveTextContent("Ronde 1");
    await user.selectOptions(screen.getByRole("combobox"), await screen.findByRole("option", { name: "Aileen" }));
    await user.type(screen.getByRole("textbox"), "Jadwal berubah");
    await user.click(screen.getByRole("button", { name: "Tinjau penggantian" }));
    expect(screen.getByRole("dialog")).toHaveTextContent("Esi");
    await user.click(screen.getByRole("button", { name: "Kembali" }));
    expect(screen.getByRole("combobox")).toHaveValue(AILEEN.id);
    expect(screen.getByRole("textbox")).toHaveValue("Jadwal berubah");
    await user.click(screen.getByRole("button", { name: "Batal" }));
    expect(trigger).toHaveFocus();
    expect(replaceMock).not.toHaveBeenCalled();
  });

  it("uses English chrome and leaves the case title unchanged", async () => {
    queueMock.mockResolvedValue([
      row({
        void_assignments: [assignment({ status: "void", void_reason: "deactivated" })],
      }),
    ]);

    render(
      <LocaleProvider locale="en">
        <AdminReviewsPage />
      </LocaleProvider>,
    );

    expect(screen.getByRole("heading", { name: "Case review" })).toBeInTheDocument();
    expect(await screen.findByText("Sengketa tanah warisan")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Needs reassignment" })).toBeInTheDocument();
  });
});
