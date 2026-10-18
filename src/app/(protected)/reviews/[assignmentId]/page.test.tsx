import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import { getCaseReview, listAssignedReviews, submitVerdict } from "@/lib/reviews/reviewApi";
import { session } from "@/test/authMock";
import {
  ASSIGNMENT_ID,
  AUTHOR_ID,
  CASE_ID,
  makeAssigned,
  makeCaseReview,
  makeReviewCopy,
  makeSlot,
  makeVerdictResult,
  makeVerdictView,
  OTHER_ASSIGNMENT_ID,
} from "@/test/reviewFixtures";
import ReviewAssignmentPage from "./page";

const { params } = vi.hoisted(() => ({ params: { assignmentId: "" } }));

// The page reads the assignment id from the URL; there is no Next router in tests.
vi.mock("next/navigation", () => ({ useParams: () => params }));
// The signed-in user (id "u1") decides whether the reviewer is also the author of the case.
vi.mock("@/hooks/useAuth", async () => await import("@/test/authMock"));
vi.mock("@/lib/reviews/reviewApi", () => ({
  listAssignedReviews: vi.fn(),
  submitVerdict: vi.fn(),
  getCaseReview: vi.fn(),
}));
// The history has its own tests; here it only has to receive the right case.
vi.mock("@/components/audit/CaseAuditHistory", () => ({
  CaseAuditHistory: ({ caseId }: { caseId: string }) => <p>Riwayat kasus {caseId}</p>,
}));

const listMock = vi.mocked(listAssignedReviews);
const submitMock = vi.mocked(submitVerdict);
const reviewMock = vi.mocked(getCaseReview);

/** The reviewer who is looking at the page, and the other one. */
const mineSlot = (overrides = {}) =>
  makeSlot({
    assignment_id: ASSIGNMENT_ID,
    reviewer: { id: "u1", name: "Aileen" },
    ...overrides,
  });
const otherSlot = (overrides = {}) => makeSlot({ verdict: null, ...overrides });

beforeEach(() => {
  listMock.mockReset();
  submitMock.mockReset();
  reviewMock.mockReset();
  session.role = "reviewer";
  params.assignmentId = ASSIGNMENT_ID;
  listMock.mockResolvedValue([makeAssigned({ assignment_id: ASSIGNMENT_ID })]);
  reviewMock.mockResolvedValue(makeCaseReview({ reviewers: [mineSlot(), otherSlot()] }));
});

describe("ReviewAssignmentPage", () => {
  // Positive
  it("shows the case, the verdict form and the second reviewer as blind", async () => {
    // Arrange / Act
    render(<ReviewAssignmentPage />);

    // Assert
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Apakah pemberitahuan tertulis kepada pekerja wajib sebelum PHK?",
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Penilaian Anda" })).toBeInTheDocument();
    expect(await screen.findByText("BUTA")).toBeInTheDocument();
    expect(reviewMock).toHaveBeenCalledWith(CASE_ID);
    expect(listMock).toHaveBeenCalledTimes(1);
  });

  // Positive
  it("links back to the queue in the breadcrumb", async () => {
    // Arrange / Act
    render(<ReviewAssignmentPage />);

    // Assert
    expect(await screen.findByRole("link", { name: "Antrean tinjauan" })).toHaveAttribute("href", "/reviews");
  });

  // Positive: AC4, sending a verdict replaces the form and the second reviewer stays hidden.
  it("replaces the form with the sent verdict and waits for the other reviewer", async () => {
    // Arrange
    submitMock.mockResolvedValue(makeVerdictResult({ decision: "approve", round_status: "open" }));
    const user = userEvent.setup();
    render(<ReviewAssignmentPage />);
    await user.click(await screen.findByRole("radio", { name: /Dapat dipertahankan sebagaimana tertulis/ }));

    // Act
    await user.click(screen.getByRole("button", { name: "Kirim penilaian" }));

    // Assert
    expect(submitMock).toHaveBeenCalledWith(ASSIGNMENT_ID, { decision: "approve", comment: null });
    expect(await screen.findByText("Menunggu peninjau lain menilai.")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Penilaian Anda" })).not.toBeInTheDocument();
    expect(screen.getByText("BUTA")).toBeInTheDocument();
  });

  // Positive: AC3 and AC6, once both have rated the outcome and both verdicts show.
  it("shows the outcome and both verdicts when the send decides the round", async () => {
    // Arrange
    submitMock.mockResolvedValue(
      makeVerdictResult({ decision: "approve", round_status: "decided", round_decision: "approved" }),
    );
    reviewMock.mockReset();
    reviewMock.mockResolvedValueOnce(makeCaseReview({ reviewers: [mineSlot(), otherSlot()] }));
    reviewMock.mockResolvedValueOnce(
      makeCaseReview({
        status: "decided",
        decision: "approved",
        reviewers: [
          mineSlot({ verdict: makeVerdictView({ decision: "approve" }) }),
          otherSlot({ verdict: makeVerdictView({ decision: "revise", comment: "Pasal salah" }) }),
        ],
      }),
    );
    const user = userEvent.setup();
    render(<ReviewAssignmentPage />);
    await user.click(await screen.findByRole("radio", { name: /Dapat dipertahankan sebagaimana tertulis/ }));

    // Act
    await user.click(screen.getByRole("button", { name: "Kirim penilaian" }));

    // Assert
    expect(await screen.findByText("Kasus disetujui")).toBeInTheDocument();
    const panel = await screen.findByRole("region", { name: "Peninjau kedua" });
    expect(within(panel).getByText("Pasal salah")).toBeInTheDocument();
    expect(screen.queryByText("BUTA")).not.toBeInTheDocument();
    expect(reviewMock).toHaveBeenCalledTimes(2);
  });

  // Positive: reopening the page after a verdict was sent.
  it("shows the verdict already sent instead of the form", async () => {
    // Arrange
    listMock.mockResolvedValue([
      makeAssigned({
        assignment_id: ASSIGNMENT_ID,
        my_verdict: makeVerdictView({ decision: "revise", comment: "Cek PP 35/2021" }),
      }),
    ]);

    // Act
    render(<ReviewAssignmentPage />);

    // Assert
    expect(await screen.findByText("Cek PP 35/2021")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Penilaian Anda" })).not.toBeInTheDocument();
    expect(screen.getByText("Menunggu peninjau lain menilai.")).toBeInTheDocument();
  });

  // Negative: the queue only holds assignments of open rounds, so a finished one is missing.
  it("says the assignment was not found when it is not in the queue", async () => {
    // Arrange
    listMock.mockResolvedValue([makeAssigned({ assignment_id: OTHER_ASSIGNMENT_ID })]);

    // Act
    render(<ReviewAssignmentPage />);

    // Assert
    expect(await screen.findByText("Penugasan tidak ditemukan")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kembali ke antrean tinjauan" })).toHaveAttribute("href", "/reviews");
    expect(screen.queryByRole("form", { name: "Penilaian Anda" })).not.toBeInTheDocument();
    expect(reviewMock).not.toHaveBeenCalled();
  });

  // Edge: the server answers 403 here and a 403 sends the user to /forbidden, so nothing is asked.
  it("explains that a reviewer cannot rate a case they wrote, and asks for nothing more", async () => {
    // Arrange
    listMock.mockResolvedValue([
      makeAssigned({ assignment_id: ASSIGNMENT_ID, case: makeReviewCopy({ author_id: "u1" }) }),
    ]);

    // Act
    render(<ReviewAssignmentPage />);

    // Assert
    expect(await screen.findByText("Anda tidak bisa meninjau kasus yang Anda tulis.")).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Penilaian Anda" })).not.toBeInTheDocument();
    expect(reviewMock).not.toHaveBeenCalled();
  });

  // Edge
  it.each(["admin", "author", "viewer"] as const)(
    "asks the server for nothing when the role is %s",
    async (role) => {
      // Arrange
      session.role = role;

      // Act
      render(<ReviewAssignmentPage />);

      // Assert
      expect(await screen.findByText("Halaman ini untuk peninjau yang ditugaskan")).toBeInTheDocument();
      await waitFor(() => expect(listMock).not.toHaveBeenCalled());
      expect(reviewMock).not.toHaveBeenCalled();
    },
  );

  // Negative
  it("shows the error with a retry when the queue cannot be loaded", async () => {
    // Arrange
    listMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL"));
    const user = userEvent.setup();
    render(<ReviewAssignmentPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal memuat antrean tinjauan. Coba lagi.");

    // Act
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(await screen.findByRole("form", { name: "Penilaian Anda" })).toBeInTheDocument();
    expect(listMock).toHaveBeenCalledTimes(2);
  });

  // Edge: the second reviewer is extra context, the reviewer can still rate without it.
  it("keeps the form when the second reviewer cannot be loaded, and offers a retry", async () => {
    // Arrange
    reviewMock.mockRejectedValueOnce(new ApiError(500, "INTERNAL"));
    reviewMock.mockResolvedValueOnce(makeCaseReview({ reviewers: [mineSlot(), otherSlot()] }));
    const user = userEvent.setup();

    // Act
    render(<ReviewAssignmentPage />);

    // Assert
    expect(await screen.findByRole("form", { name: "Penilaian Anda" })).toBeInTheDocument();
    expect(await screen.findByRole("alert")).toHaveTextContent("Gagal memuat penilaian kasus. Coba lagi.");
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));
    expect(await screen.findByText("BUTA")).toBeInTheDocument();
  });

  // Edge: the id comes encoded from the URL and must be decoded once before it is matched.
  it("decodes the assignment id from the URL", async () => {
    // Arrange
    params.assignmentId = "a%2Fb";
    listMock.mockResolvedValue([makeAssigned({ assignment_id: "a/b" })]);

    // Act
    render(<ReviewAssignmentPage />);

    // Assert
    expect(await screen.findByRole("form", { name: "Penilaian Anda" })).toBeInTheDocument();
  });

  // Edge: the case the reviewer rates is the one the page names, whoever wrote it.
  it("does not treat another author's case as the reviewer's own", async () => {
    // Arrange
    listMock.mockResolvedValue([
      makeAssigned({ assignment_id: ASSIGNMENT_ID, case: makeReviewCopy({ author_id: AUTHOR_ID }) }),
    ]);

    // Act
    render(<ReviewAssignmentPage />);

    // Assert
    expect(await screen.findByRole("form", { name: "Penilaian Anda" })).toBeInTheDocument();
    expect(screen.queryByText("Anda tidak bisa meninjau kasus yang Anda tulis.")).not.toBeInTheDocument();
  });
});

describe("ReviewAssignmentPage tabs", () => {
  // Positive
  it("opens on the Penilaian tab and loads no history yet", async () => {
    // Arrange / Act
    render(<ReviewAssignmentPage />);

    // Assert
    const tabs = await screen.findByRole("tablist", { name: "Bagian penilaian" });
    expect(within(tabs).getByRole("tab", { name: "Penilaian" })).toHaveAttribute("aria-selected", "true");
    expect(within(tabs).getByRole("tab", { name: "Riwayat" })).toHaveAttribute("aria-selected", "false");
    const panel = screen.getByRole("tabpanel", { name: "Penilaian" });
    expect(within(panel).getByRole("form", { name: "Penilaian Anda" })).toBeInTheDocument();
    expect(screen.queryByText(/Riwayat kasus/)).not.toBeInTheDocument();
  });

  // Positive: SCRUM-168, the history belongs to the case under review.
  it("shows the history of this case on the Riwayat tab", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ReviewAssignmentPage />);

    // Act
    await user.click(await screen.findByRole("tab", { name: "Riwayat" }));

    // Assert
    const panel = screen.getByRole("tabpanel", { name: "Riwayat" });
    expect(within(panel).getByText(`Riwayat kasus ${CASE_ID}`)).toBeInTheDocument();
    expect(screen.queryByRole("form", { name: "Penilaian Anda" })).not.toBeInTheDocument();
    expect(await screen.findByRole("region", { name: "Peninjau kedua" })).toBeInTheDocument();
  });

  // Edge: the form stays mounted, so a draft survives a look at the history.
  it("keeps an unsent comment after a visit to the Riwayat tab", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<ReviewAssignmentPage />);
    await user.type(await screen.findByLabelText(/Komentar untuk penulis/), "Pasal 151 kurang tepat");

    // Act
    await user.click(screen.getByRole("tab", { name: "Riwayat" }));
    await user.click(screen.getByRole("tab", { name: "Penilaian" }));

    // Assert
    expect(screen.getByLabelText(/Komentar untuk penulis/)).toHaveValue("Pasal 151 kurang tepat");
  });
});
