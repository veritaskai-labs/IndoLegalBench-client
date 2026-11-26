import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ManualSessionHeader } from "./ManualSessionHeader";
import { PROGRESS_POLL_MS } from "@/hooks/useMeasurementProgress";
import { ApiError } from "@/lib/apiClient";
import type { GradingGateway } from "@/lib/grading/gradingApi";
import { gradingProgress } from "@/test/gradingFixtures";
import type { SessionGradingResponse } from "@/types/grading";
import type { ManualSessionDetail } from "@/types/measurement";
import type { Role } from "@/types";

const showToastMock = vi.fn();
vi.mock("@/components/ui/Toast", () => ({
  useToast: () => ({ showToast: showToastMock }),
}));

// Unduh skor reads the latest grading result. Tests that don't pass a gateway must not hit the network.
vi.mock("@/lib/grading/gradingApi", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/grading/gradingApi")>();
  const { ApiError } = await import("@/lib/apiClient");
  return {
    ...actual,
    httpGradingGateway: {
      enqueue: vi.fn(),
      progress: vi.fn().mockResolvedValue(null),
      estimate: vi.fn(),
      results: vi.fn().mockRejectedValue(new ApiError(404, "GRADING_NOT_FOUND")),
      runs: vi.fn(),
      run: vi.fn(),
      sessions: vi.fn(),
    },
  };
});

vi.mock("./FinalizeSessionDialog", () => ({
  FinalizeSessionDialog: ({
    onFinalized,
    onClose,
  }: {
    sessionId: string;
    sessionLabel: string;
    onFinalized: () => void;
    onClose: () => void;
  }) => (
    <div data-testid="finalize-dialog">
      <button type="button" onClick={onFinalized}>
        Confirm Finalize
      </button>
      <button type="button" onClick={onClose}>
        Cancel Finalize
      </button>
    </div>
  ),
}));

vi.mock("@/components/grading/GradeSessionDialog", () => ({
  GradeSessionDialog: ({
    title,
    onQueued,
    onClose,
  }: {
    session: { id: string; label: string };
    title?: string;
    gateway?: unknown;
    onQueued: (res: unknown) => void;
    onClose: (afterError: boolean) => void;
  }) => (
    <div data-testid="grade-dialog" data-title={title}>
      <button type="button" onClick={() => onQueued({ grading_run_id: "run-1", status: "queued" })}>
        Confirm Grade
      </button>
      <button type="button" onClick={() => onClose(false)}>
        Cancel Grade
      </button>
      <button type="button" onClick={() => onClose(true)}>
        Error Close Grade
      </button>
    </div>
  ),
}));

function createMockDetail(overrides: Partial<ManualSessionDetail> = {}): ManualSessionDetail {
  return {
    id: "session-1",
    label: "Pengukuran LegalHero Batch 1",
    purpose: "official",
    status: "partially_filled",
    product_name: "LegalHero",
    vendor_name: "LegalHero Inc",
    site_url: "https://legalhero.id",
    manual_params: "Paket Premium 299k",
    case_filter: "both",
    repetitions: 1,
    filled_answers: 20,
    total_answers: 50,
    answer_date_from: "2026-11-01T00:00:00Z",
    answer_date_to: "2026-11-07T00:00:00Z",
    date_range_warning: false,
    created_by: "u-admin",
    created_at: "2026-11-01T10:00:00Z",
    finalized_at: null,
    finalized_by: null,
    cases: [],
    ...overrides,
  };
}

function fakeGradingGateway(progress: GradingGateway["progress"] = () => Promise.resolve(null)): GradingGateway {
  return {
    enqueue: vi.fn(),
    progress: vi.fn(progress),
    estimate: vi.fn(),
    results: vi.fn().mockRejectedValue(new ApiError(404, "GRADING_NOT_FOUND")),
    runs: vi.fn(),
    run: vi.fn(),
    sessions: vi.fn(),
  };
}

function renderGradable({
  progress,
  role = "admin",
  onSessionUpdated = vi.fn(),
}: { progress?: GradingGateway["progress"]; role?: Role; onSessionUpdated?: () => void } = {}) {
  const session = createMockDetail({ status: "complete", filled_answers: 50, total_answers: 50 });
  const gradingGateway = fakeGradingGateway(progress);
  render(
    <ManualSessionHeader
      session={session}
      role={role}
      unfilledOnly={false}
      onToggleUnfilled={vi.fn()}
      onSessionUpdated={onSessionUpdated}
      gradingGateway={gradingGateway}
    />,
  );
  return { session, gradingGateway, onSessionUpdated };
}

describe("ManualSessionHeader (PBI-22 AC8, AC9, AC10, AC12, AC13)", () => {
  beforeEach(() => {
    showToastMock.mockClear();
  });

  // K-13 (SCRUM-285): "Kirim untuk Dinilai" runs in the background and its progress shows here.
  describe("background grading progress", () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    it("shows the queued run and turns 'Kirim untuk Dinilai' off once the dialog closes", async () => {
      const user = userEvent.setup();
      const progress = vi
        .fn<GradingGateway["progress"]>()
        .mockResolvedValueOnce(null)
        .mockResolvedValue(gradingProgress({ grading_run_id: "run-1", status: "queued", attempts_graded: 0, attempts_total: 50, percent: 0 }));
      renderGradable({ progress });
      await waitFor(() => expect(progress).toHaveBeenCalledTimes(1));

      await user.click(screen.getByRole("button", { name: /kirim untuk dinilai/i }));
      await user.click(screen.getByRole("button", { name: "Confirm Grade" }));

      expect(await screen.findByText("Menunggu giliran penilaian · 0 dari 50 percobaan (0%)")).toBeInTheDocument();
      const gradeBtn = screen.getByRole("button", { name: /kirim untuk dinilai/i });
      expect(gradeBtn).toBeDisabled();
      expect(gradeBtn).toHaveAttribute("title", "Penilaian sesi ini sedang berjalan di latar belakang.");
    });

    // AC: progress stays right after a refresh or after coming back to the page.
    it("shows a run that is already running when the page opens", async () => {
      renderGradable({
        progress: () => Promise.resolve(gradingProgress({ status: "running", attempts_graded: 10, attempts_total: 50, percent: 20 })),
      });

      expect(await screen.findByText("10 dari 50 percobaan dinilai (20%)")).toBeInTheDocument();
      expect(screen.getByRole("progressbar", { name: "Progres penilaian" })).toHaveAttribute("value", "20");
      expect(screen.getByRole("button", { name: /kirim untuk dinilai/i })).toBeDisabled();
    });

    it("explains why 'Kirim untuk Dinilai' is off while a run is grading, and keeps 'Tandai Selesai' free of that reason", async () => {
      renderGradable({
        progress: () => Promise.resolve(gradingProgress({ status: "running", attempts_graded: 10, attempts_total: 50, percent: 20 })),
      });

      const reason = "Penilaian sesi ini sedang berjalan. Tunggu sampai selesai.";
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /kirim untuk dinilai/i })).toHaveAccessibleDescription(reason),
      );
      expect(screen.getByText(reason)).toBeVisible();
      expect(screen.getByRole("button", { name: /tandai selesai/i })).not.toHaveAccessibleDescription(reason);
    });

    // The manual page has no score table: the session moves to Dinilai and the report is one click away.
    it("reloads the session and links to the report when the run finishes", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const progress = vi
        .fn<GradingGateway["progress"]>()
        .mockResolvedValueOnce(gradingProgress({ status: "running" }))
        .mockResolvedValue(gradingProgress({ status: "finished", percent: 100 }));
      const { session, onSessionUpdated } = renderGradable({ progress });
      expect(await screen.findByRole("progressbar", { name: "Progres penilaian" })).toBeInTheDocument();

      await vi.advanceTimersByTimeAsync(PROGRESS_POLL_MS);

      await waitFor(() => expect(onSessionUpdated).toHaveBeenCalledTimes(1));
      expect(showToastMock).toHaveBeenCalledWith(`Sesi “${session.label}” selesai dinilai.`, {
        label: "Lihat laporan →",
        href: `/reports/sessions/${session.id}`,
      });
      expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    });

    it("explains a failed run and lets the Admin send it again", async () => {
      renderGradable({ progress: () => Promise.resolve(gradingProgress({ status: "failed", error_code: "NO_SCORE" })) });

      expect(await screen.findByRole("alert")).toHaveTextContent("Penilaian terakhir gagal.");
      expect(screen.getByRole("button", { name: /kirim untuk dinilai/i })).toBeEnabled();
    });

    // K-19 (SCRUM-290): the failed message offers the retry here too, through the same confirmation dialog.
    it("opens the retry confirmation from the failure message and follows the new run", async () => {
      const user = userEvent.setup();
      const progress = vi
        .fn<GradingGateway["progress"]>()
        .mockResolvedValueOnce(gradingProgress({ status: "failed", error_code: "judge_unavailable" }))
        .mockResolvedValue(gradingProgress({ grading_run_id: "run-1", status: "queued", attempts_graded: 0, attempts_total: 50, percent: 0 }));
      renderGradable({ progress });

      await user.click(await screen.findByRole("button", { name: "Coba Nilai Ulang" }));

      expect(screen.getByTestId("grade-dialog")).toHaveAttribute("data-title", "Coba nilai ulang sesi ini?");
      await user.click(screen.getByRole("button", { name: "Confirm Grade" }));
      expect(await screen.findByText("Menunggu giliran penilaian · 0 dari 50 percobaan (0%)")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Coba Nilai Ulang" })).not.toBeInTheDocument();
    });

    it("keeps the normal confirmation title for Kirim untuk Dinilai", async () => {
      const user = userEvent.setup();
      renderGradable();

      await user.click(screen.getByRole("button", { name: /kirim untuk dinilai/i }));

      expect(screen.getByTestId("grade-dialog")).not.toHaveAttribute("data-title");
    });

    // The progress endpoint is Admin only, and contributors cannot grade.
    it("does not ask a contributor for grading progress", async () => {
      const { session, gradingGateway } = renderGradable({ role: "contributor" });

      expect(await screen.findByText(session.label)).toBeInTheDocument();
      expect(screen.queryByRole("progressbar", { name: "Progres penilaian" })).not.toBeInTheDocument();
      expect(gradingGateway.progress).not.toHaveBeenCalled();
    });
  });
  it("renders metadata, product info, and progress 'X dari N jawaban terisi'", () => {
    const session = createMockDetail();
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.getByText("Pengukuran LegalHero Batch 1")).toBeInTheDocument();
    expect(screen.getByText("LegalHero")).toBeInTheDocument();
    expect(screen.getByText("LegalHero Inc")).toBeInTheDocument();
    expect(screen.getByText("Paket Premium 299k")).toBeInTheDocument();
    expect(screen.getByText("Pengukuran Resmi")).toBeInTheDocument();
    expect(screen.getByText("Semua (Dev & Test)")).toBeInTheDocument();
    expect(screen.getByText("1 kali")).toBeInTheDocument();

    // Progress
    expect(screen.getByText("20")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(
      screen.getByText((_, el) => el?.tagName.toLowerCase() === "p" && /20 dari 50 jawaban terisi \(40%\)/.test(el.textContent || "")),
    ).toBeInTheDocument();
  });

  it("shows 'Jumlah percobaan berbeda' tag when repetitions is not 3 (AC12)", () => {
    const session = createMockDetail({ repetitions: 1 });
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.getByText("Jumlah percobaan berbeda")).toBeInTheDocument();
  });

  it("does NOT show 'Jumlah percobaan berbeda' tag when repetitions is 3 (AC12)", () => {
    const session = createMockDetail({ repetitions: 3 });
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.queryByText("Jumlah percobaan berbeda")).not.toBeInTheDocument();
  });

  it("displays date range warning alert banner when date_range_warning is true (AC13)", () => {
    const session = createMockDetail({ date_range_warning: true });
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      /Rentang tanggal pengambilan jawaban dalam sesi ini melebihi batas hari/i,
    );
  });

  it("calls onToggleUnfilled when the unfilled checkbox is clicked (AC8)", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const session = createMockDetail();

    render(
      <ManualSessionHeader
        session={session}
        role="contributor"
        unfilledOnly={false}
        onToggleUnfilled={onToggle}
        onSessionUpdated={vi.fn()}
      />,
    );

    const checkbox = screen.getByLabelText(/hanya yang belum terisi/i);
    await user.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith(true);
  });

  it("disables 'Tandai Selesai' and 'Kirim untuk Dinilai' when answers are incomplete (AC8, AC9)", () => {
    const session = createMockDetail({ filled_answers: 49, total_answers: 50 });
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    const finalizeBtn = screen.getByRole("button", { name: /tandai selesai/i });
    expect(finalizeBtn).toBeDisabled();

    const gradeBtn = screen.getByRole("button", { name: /kirim untuk dinilai/i });
    expect(gradeBtn).toBeDisabled();
    expect(gradeBtn).toHaveAttribute(
      "title",
      "Semua jawaban harus terisi sebelum dapat dikirim untuk dinilai.",
    );
  });

  it("says how many answers are still missing under the disabled session actions", () => {
    const session = createMockDetail({ filled_answers: 42, total_answers: 50 });
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    const reason = "Isi 8 jawaban lagi untuk mengaktifkan tombol ini.";
    expect(screen.getByText(reason)).toBeVisible();
    expect(screen.getByRole("button", { name: /tandai selesai/i })).toHaveAccessibleDescription(reason);
    expect(screen.getByRole("button", { name: /kirim untuk dinilai/i })).toHaveAccessibleDescription(reason);
  });

  it("shows no missing-answer reason once every answer is filled", () => {
    const session = createMockDetail({ status: "complete", filled_answers: 50, total_answers: 50 });
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.queryByText(/jawaban lagi untuk mengaktifkan/)).not.toBeInTheDocument();
  });

  it("names the product on the platform site link", () => {
    render(
      <ManualSessionHeader
        session={createMockDetail()}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.getByRole("link", { name: "Buka situs LegalHero ↗" })).toHaveAttribute("href", "https://legalhero.id");
  });

  it("enables 'Tandai Selesai' and 'Kirim untuk Dinilai' when all answers are filled (AC8, AC9)", () => {
    const session = createMockDetail({
      status: "complete",
      filled_answers: 50,
      total_answers: 50,
    });
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    const finalizeBtn = screen.getByRole("button", { name: /tandai selesai/i });
    expect(finalizeBtn).toBeEnabled();

    const gradeBtn = screen.getByRole("button", { name: /kirim untuk dinilai/i });
    expect(gradeBtn).toBeEnabled();
    expect(gradeBtn).toHaveAttribute(
      "title",
      "Kirim sesi ini untuk dinilai.",
    );
  });

  it("opens GradeSessionDialog on 'Kirim untuk Dinilai' click and closes on cancel", async () => {
    const user = userEvent.setup();
    const session = createMockDetail({
      status: "complete",
      filled_answers: 50,
      total_answers: 50,
    });

    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    const gradeBtn = screen.getByRole("button", { name: /kirim untuk dinilai/i });
    await user.click(gradeBtn);

    expect(screen.getByTestId("grade-dialog")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "Cancel Grade" });
    await user.click(cancelBtn);

    expect(screen.queryByTestId("grade-dialog")).not.toBeInTheDocument();
  });

  // K-13 (SCRUM-285): "Kirim untuk Dinilai" no longer waits for the judge in the pop-up.
  it("closes the dialog once grading is queued and says it runs in the background", async () => {
    const user = userEvent.setup();
    const onSessionUpdated = vi.fn();
    const session = createMockDetail({
      status: "complete",
      filled_answers: 50,
      total_answers: 50,
    });

    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={onSessionUpdated}
      />,
    );

    await user.click(screen.getByRole("button", { name: /kirim untuk dinilai/i }));
    expect(screen.getByTestId("grade-dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm Grade" }));

    expect(screen.queryByTestId("grade-dialog")).not.toBeInTheDocument();
    expect(showToastMock).toHaveBeenCalledWith(`Penilaian sesi “${session.label}” berjalan di latar belakang.`);
    // Nothing is graded yet, so the session itself has not changed.
    expect(onSessionUpdated).not.toHaveBeenCalled();
  });

  it("reloads session when GradeSessionDialog closes after an error", async () => {
    const user = userEvent.setup();
    const onSessionUpdated = vi.fn();
    const session = createMockDetail({
      status: "complete",
      filled_answers: 50,
      total_answers: 50,
    });

    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={onSessionUpdated}
      />,
    );

    await user.click(screen.getByRole("button", { name: /kirim untuk dinilai/i }));
    expect(screen.getByTestId("grade-dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Error Close Grade" }));

    expect(screen.queryByTestId("grade-dialog")).not.toBeInTheDocument();
    expect(onSessionUpdated).toHaveBeenCalledTimes(1);
  });

  it("does NOT show 'Kirim untuk Dinilai' button for non-admin users (AC8, AC9)", () => {
    const session = createMockDetail({
      status: "complete",
      filled_answers: 50,
      total_answers: 50,
    });
    render(
      <ManualSessionHeader
        session={session}
        role="contributor"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: /kirim untuk dinilai/i })).not.toBeInTheDocument();
  });

  it("does NOT display cost estimates, budget or failure rates (AC10)", () => {
    const session = createMockDetail();
    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.queryByText(/anggaran/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/biaya berjalan/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tingkat kegagalan/i)).not.toBeInTheDocument();
  });

  it("opens FinalizeSessionDialog on 'Tandai Selesai' click and closes on cancel", async () => {
    const user = userEvent.setup();
    const session = createMockDetail({
      status: "complete",
      filled_answers: 50,
      total_answers: 50,
    });

    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    const finalizeBtn = screen.getByRole("button", { name: "Tandai Selesai" });
    await user.click(finalizeBtn);

    expect(screen.getByTestId("finalize-dialog")).toBeInTheDocument();

    const cancelBtn = screen.getByRole("button", { name: "Cancel Finalize" });
    await user.click(cancelBtn);

    expect(screen.queryByTestId("finalize-dialog")).not.toBeInTheDocument();
  });

  it("handles finalize completion and triggers onSessionUpdated", async () => {
    const user = userEvent.setup();
    const onSessionUpdated = vi.fn();
    const session = createMockDetail({
      status: "complete",
      filled_answers: 50,
      total_answers: 50,
    });

    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={onSessionUpdated}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Tandai Selesai" }));
    expect(screen.getByTestId("finalize-dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirm Finalize" }));

    expect(screen.queryByTestId("finalize-dialog")).not.toBeInTheDocument();
    expect(onSessionUpdated).toHaveBeenCalledTimes(1);
  });

  it("handles 0 total answers with 0% progress", () => {
    const session = createMockDetail({
      filled_answers: 0,
      total_answers: 0,
    });

    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        (_, el) =>
          el?.tagName.toLowerCase() === "p" &&
          /0 dari 0 jawaban terisi \(0%\)/.test(el.textContent || ""),
      ),
    ).toBeInTheDocument();
    const reason = "Sesi ini tidak memiliki jawaban untuk diisi.";
    expect(screen.getByText(reason)).toBeVisible();
    expect(screen.getByRole("button", { name: /tandai selesai/i })).toHaveAccessibleDescription(reason);
    expect(screen.getByRole("button", { name: /kirim untuk dinilai/i })).toHaveAccessibleDescription(reason);
  });

  it("renders finalized timestamp and hides 'Tandai Selesai' button when finalized", () => {
    const session = createMockDetail({
      status: "finalized",
      finalized_at: "2026-11-08T12:00:00Z",
      filled_answers: 50,
      total_answers: 50,
    });

    render(
      <ManualSessionHeader
        session={session}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
      />,
    );

    expect(screen.getByText(/08 Nov 2026/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Tandai Selesai" })).not.toBeInTheDocument();
  });

  it("offers Unduh skor once a finalized session has a grading result", async () => {
    const gradingGateway = fakeGradingGateway();
    gradingGateway.results = vi.fn().mockResolvedValue({} as SessionGradingResponse);

    render(
      <ManualSessionHeader
        session={createMockDetail({ status: "finalized", finalized_at: "2026-11-08T12:00:00Z" })}
        role="admin"
        unfilledOnly={false}
        onToggleUnfilled={vi.fn()}
        onSessionUpdated={vi.fn()}
        gradingGateway={gradingGateway}
      />,
    );

    expect(await screen.findByRole("button", { name: "Unduh skor" })).toBeEnabled();
  });

  it("enables Unduh skor for a finalized session when that grading result reloads", async () => {
    vi.useFakeTimers();
    try {
      const gradingGateway = fakeGradingGateway();
      vi.mocked(gradingGateway.progress)
        .mockResolvedValueOnce(gradingProgress({ status: "running", grading_run_id: "run-1" }))
        .mockResolvedValue(
          gradingProgress({
            status: "finished",
            grading_run_id: "run-1",
            finished_at: "2026-11-15T03:05:00Z",
            percent: 100,
            attempts_graded: 12,
            attempts_ungraded: 0,
          }),
        );
      vi.mocked(gradingGateway.results).mockRejectedValue(new ApiError(404, "GRADING_NOT_FOUND"));

      render(
        <ManualSessionHeader
          session={createMockDetail({ status: "finalized", finalized_at: "2026-11-08T12:00:00Z" })}
          role="admin"
          unfilledOnly={false}
          onToggleUnfilled={vi.fn()}
          onSessionUpdated={vi.fn()}
          gradingGateway={gradingGateway}
        />,
      );
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByRole("button", { name: "Unduh skor" })).toBeDisabled();
      expect(gradingGateway.results).toHaveBeenCalledTimes(1);

      vi.mocked(gradingGateway.results).mockResolvedValue({} as SessionGradingResponse);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(5000);
      });

      expect(screen.getByRole("button", { name: "Unduh skor" })).toBeEnabled();
      expect(gradingGateway.results).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });
});
