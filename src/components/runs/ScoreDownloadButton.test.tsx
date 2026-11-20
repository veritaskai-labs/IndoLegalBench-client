import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { saveBlob } from "@/lib/browserDownload";
import { SCORE_DOWNLOAD_REASON, type ScoreDownloadSession, type ScoreGrading } from "@/lib/runs/scoreDownload";
import type { ScoreFile } from "@/lib/runs/scoreDownloadApi";
import { ScoreDownloadButton } from "./ScoreDownloadButton";

vi.mock("@/lib/browserDownload", () => ({ saveBlob: vi.fn() }));

const save = vi.mocked(saveBlob);

function session(overrides: Partial<ScoreDownloadSession & { id: string }> = {}) {
  return {
    id: "s-1",
    status: "finished" as const,
    session_type: "automatic" as const,
    accepted_as_is_at: null,
    accepted_as_is_reason: null,
    ...overrides,
  };
}

function file(): ScoreFile {
  return { blob: new Blob(["kasus\n"], { type: "text/csv;charset=utf-8" }), fileName: "skor-s-1.csv" };
}

beforeEach(() => {
  save.mockReset();
});

describe("ScoreDownloadButton (SCRUM-329)", () => {
  it("offers Unduh skor with no explanation when the session can be downloaded", () => {
    render(<ScoreDownloadButton session={session()} grading="graded" download={() => Promise.resolve(file())} />);

    expect(screen.getByRole("button", { name: "Unduh skor" })).toBeEnabled();
    expect(screen.queryByText(SCORE_DOWNLOAD_REASON.notGraded)).not.toBeInTheDocument();
    expect(screen.queryByText(SCORE_DOWNLOAD_REASON.inProgress)).not.toBeInTheDocument();
    expect(screen.queryByText(SCORE_DOWNLOAD_REASON.resume)).not.toBeInTheDocument();
    expect(screen.queryByText(SCORE_DOWNLOAD_REASON.notAccepted)).not.toBeInTheDocument();
  });

  it.each<[ScoreDownloadSession["status"], ScoreGrading, string]>([
    ["running", "graded", SCORE_DOWNLOAD_REASON.inProgress],
    ["cancelled", "graded", SCORE_DOWNLOAD_REASON.resume],
    ["finished_with_failures", "graded", SCORE_DOWNLOAD_REASON.notAccepted],
    ["finished", "ungraded", SCORE_DOWNLOAD_REASON.notGraded],
  ])("disables the button and explains a %s session", (status, grading, reason) => {
    render(
      <ScoreDownloadButton
        session={session({ status })}
        grading={grading}
        download={() => Promise.resolve(file())}
      />,
    );

    const button = screen.getByRole("button", { name: "Unduh skor" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-describedby");
    expect(screen.getByText(reason)).toBeInTheDocument();
  });

  it("shows no reason while a finished session's grading result is still loading", () => {
    render(<ScoreDownloadButton session={session()} grading="unknown" download={() => Promise.resolve(file())} />);

    expect(screen.getByRole("button", { name: "Unduh skor" })).toBeDisabled();
    expect(screen.queryByText(SCORE_DOWNLOAD_REASON.notGraded)).not.toBeInTheDocument();
  });

  it("saves the file returned for that session id", async () => {
    const user = userEvent.setup();
    const download = vi.fn().mockResolvedValue(file());
    render(<ScoreDownloadButton session={session()} grading="graded" download={download} />);

    await user.click(screen.getByRole("button", { name: "Unduh skor" }));

    expect(download).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledWith("s-1");
    expect(save).toHaveBeenCalledWith(expect.any(Blob), "skor-s-1.csv");
  });

  it("does not ask for a file when the session is not eligible", async () => {
    const user = userEvent.setup();
    const download = vi.fn().mockResolvedValue(file());
    render(<ScoreDownloadButton session={session({ status: "running" })} grading="graded" download={download} />);

    await user.click(screen.getByRole("button", { name: "Unduh skor" }));

    expect(download).not.toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
  });

  it("says the request failed and does not save a file when the download rejects", async () => {
    const user = userEvent.setup();
    const download = vi.fn().mockRejectedValue(new Error("Jawaban mentah bocor"));
    render(<ScoreDownloadButton session={session()} grading="graded" download={download} />);

    await user.click(screen.getByRole("button", { name: "Unduh skor" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Permintaan gagal. Coba lagi.");
    expect(screen.queryByText("Jawaban mentah bocor")).not.toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
  });
});
