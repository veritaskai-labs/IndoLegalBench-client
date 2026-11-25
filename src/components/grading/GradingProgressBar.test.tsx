import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { GradingProgressResource } from "@/hooks/useGradingProgress";
import { gradingProgress } from "@/test/gradingFixtures";
import type { GradingProgress } from "@/types/grading";
import { GradingProgressBar } from "./GradingProgressBar";

function ready(data: GradingProgress | null, active = data?.status === "queued" || data?.status === "running"): GradingProgressResource {
  return { status: "ready", data, active, reload: vi.fn(), started: vi.fn() };
}

describe("GradingProgressBar (K-13, SCRUM-285)", () => {
  it("shows how many attempts are graded and the percentage while the run is running", () => {
    render(<GradingProgressBar progress={ready(gradingProgress({ status: "running", attempts_graded: 3, attempts_total: 12, percent: 25 }))} />);

    expect(screen.getByText("Penilaian berjalan di latar belakang")).toBeInTheDocument();
    expect(screen.getByText("3 dari 12 percobaan dinilai (25%)")).toBeInTheDocument();
    const bar = screen.getByRole("progressbar", { name: "Progres penilaian" });
    expect(bar).toHaveAttribute("value", "25");
    expect(bar).toHaveAttribute("max", "100");
  });

  it("says the run is waiting for its turn while it is queued", () => {
    render(<GradingProgressBar progress={ready(gradingProgress({ status: "queued", attempts_graded: 0, attempts_total: 12, percent: 0 }))} />);

    expect(screen.getByText("Menunggu giliran penilaian · 0 dari 12 percobaan (0%)")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progres penilaian" })).toHaveAttribute("value", "0");
  });

  // Right after 202 the hook says active before the server has returned the new run.
  it("shows the waiting state when a run was just queued and the old run is still the latest read", () => {
    render(<GradingProgressBar progress={ready(gradingProgress({ status: "finished", percent: 100 }), true)} />);

    expect(screen.getByText(/^Menunggu giliran penilaian/)).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "Progres penilaian" })).toHaveAttribute("value", "0");
  });

  it.each([
    ["never graded", null],
    ["finished", gradingProgress({ status: "finished", percent: 100 })],
  ])("shows nothing when the latest run is %s", (_name, data) => {
    const { container } = render(<GradingProgressBar progress={ready(data)} />);

    expect(container).toBeEmptyDOMElement();
  });

  // No skeleton: the bar would flash on every page load for a session that is not being graded.
  it("shows nothing while the first read is loading", () => {
    const { container } = render(
      <GradingProgressBar progress={{ status: "loading", active: false, reload: vi.fn(), started: vi.fn() }} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it.each([
    ["GRADING_INTERRUPTED", "Penilaian terhenti di tengah jalan karena layanan penilai berhenti. Tidak ada hasil yang tersimpan."],
    ["SOMETHING_NEW", "Tidak ada hasil yang tersimpan."],
    [null, "Tidak ada hasil yang tersimpan."],
  ])("explains a failed run with error code %s", (code, reason) => {
    render(<GradingProgressBar progress={ready(gradingProgress({ status: "failed", error_code: code }))} />);

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Penilaian terakhir gagal.");
    expect(alert).toHaveTextContent(reason);
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  describe("Coba Nilai Ulang (K-19, SCRUM-290)", () => {
    const RETRY = { name: "Coba Nilai Ulang" };

    // Positive: the Admin can start again from the failure message, whatever the reason was.
    it.each(["judge_not_configured", "judge_unavailable", "judge_pricing_missing", "judge_budget_exhausted", "judge_incomplete", "NO_SCORE", "GRADING_INTERRUPTED", "ANSWERS_CHANGED_DURING_GRADING", "GRADING_ERROR", "SOMETHING_NEW", null])(
      "offers it next to the message when the run failed with %s",
      async (code) => {
        const onRetry = vi.fn();
        render(<GradingProgressBar progress={ready(gradingProgress({ status: "failed", error_code: code }))} onRetry={onRetry} />);

        await userEvent.click(within(screen.getByRole("alert")).getByRole("button", RETRY));

        expect(onRetry).toHaveBeenCalledTimes(1);
      },
    );

    // Negative: an archived session cannot be graded, so a retry could only be refused.
    it("does not offer it when the session was archived during grading", () => {
      render(
        <GradingProgressBar progress={ready(gradingProgress({ status: "failed", error_code: "SESSION_ARCHIVED" }))} onRetry={vi.fn()} />,
      );

      expect(screen.getByRole("alert")).toHaveTextContent("Sesi diarsipkan saat penilaian berjalan.");
      expect(screen.queryByRole("button", RETRY)).not.toBeInTheDocument();
    });

    // Negative: callers that cannot start grading (not Admin, archived session) pass no handler.
    it("shows only the message when the caller gives no way to retry", () => {
      render(<GradingProgressBar progress={ready(gradingProgress({ status: "failed", error_code: "GRADING_ERROR" }))} />);

      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.queryByRole("button", RETRY)).not.toBeInTheDocument();
    });

    // Edge: a run that is queued, running or finished has nothing to retry.
    it.each(["queued", "running", "finished"] as const)("does not offer it while the latest run is %s", (status) => {
      render(<GradingProgressBar progress={ready(gradingProgress({ status, percent: 100 }))} onRetry={vi.fn()} />);

      expect(screen.queryByRole("button", RETRY)).not.toBeInTheDocument();
    });
  });

  it("explains a failed first read and retries it", async () => {
    const reload = vi.fn();
    render(
      <GradingProgressBar
        progress={{ status: "error", message: "Gagal memuat progres penilaian. Coba lagi.", active: false, reload, started: vi.fn() }}
      />,
    );

    expect(screen.getByText("Gagal memuat progres penilaian. Coba lagi.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /coba lagi/i }));
    expect(reload).toHaveBeenCalled();
  });
});
