import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { getAttemptCalls } from "@/lib/runs/runsApi";
import type { FailedAttempt } from "@/lib/runs/sessionErrors";
import type { AttemptCalls } from "@/types/measurement";
import { SessionErrorSummary } from "./SessionErrorSummary";

vi.mock("@/lib/runs/runsApi", () => ({
  getAttemptCalls: vi.fn(),
}));

const readCalls = vi.mocked(getAttemptCalls);

const SESSION_ID = "11111111-1111-1111-1111-111111111111";

function failure(
  overrides: Partial<FailedAttempt> = {}
): FailedAttempt {
  return {
    key: "item-1-2",
    caseCode: "PJK-001",
    title: "Pajak penghasilan karyawan",
    repetitionNo: 2,
    modelVersion: "gemini-2.0-flash",
    attemptId: null,
    ...overrides,
  };
}

function detail(
  overrides: Partial<AttemptCalls> = {}
): AttemptCalls {
  return {
    attempt_id: "a-1",
    repetition_no: 2,
    status: "technical_failure",
    masked: false,
    calls: [
      {
        try_no: 1,
        is_manual_retry: false,
        started_at: "2026-11-05T03:00:00Z",
        ended_at: "2026-11-05T03:00:02Z",
        duration_ms: 1840,
        result: "error",
        failure_kind: "timeout",
        model_version: "gemini-2.0-flash",
        error_summary: "HTTP 504 dari penyedia",
        raw_response: { error: { code: 504 } },
      },
    ],
    ...overrides,
  };
}

async function openTechnicalDetails() {
  await userEvent.click(
    screen.getByRole("button", {
      name: "Lihat detail teknis",
    })
  );
}

beforeEach(() => {
  readCalls.mockReset();
  readCalls.mockResolvedValue(detail());
});

describe("SessionErrorSummary", () => {
  it("renders nothing without failures", () => {
    const { container } = render(
      <SessionErrorSummary
        sessionId={SESSION_ID}
        failures={[]}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("displays a simple failure summary", () => {
    render(
      <SessionErrorSummary
        sessionId={SESSION_ID}
        failures={[failure()]}
      />
    );

    expect(
      screen.getByText("1 panggilan gagal karena masalah teknis")
    ).toBeInTheDocument();
  });

  it("keeps technical details closed initially", () => {
    render(
      <SessionErrorSummary
        sessionId={SESSION_ID}
        failures={[failure()]}
      />
    );

    expect(screen.queryByText("PJK-001")).not.toBeInTheDocument();

    expect(
      screen.getByRole("button", {
        name: "Lihat detail teknis",
      })
    ).toHaveAttribute("aria-expanded", "false");
  });

  it("displays case and model information when expanded", async () => {
    render(
      <SessionErrorSummary
        sessionId={SESSION_ID}
        failures={[failure()]}
      />
    );

    await openTechnicalDetails();

    expect(screen.getByText("PJK-001")).toBeInTheDocument();
    expect(screen.getByText("Pengulangan ke-2")).toBeInTheDocument();
    expect(
      screen.getByText("Model gemini-2.0-flash")
    ).toBeInTheDocument();
  });
});

describe("SessionErrorSummary without attempt ID", () => {
  it("explains that the API has not supplied the detail", async () => {
    render(
      <SessionErrorSummary
        sessionId={SESSION_ID}
        failures={[failure({ attemptId: null })]}
      />
    );

    await openTechnicalDetails();

    expect(
      screen.getByText(/Pesan asli dari penyedia belum dikirim/)
    ).toBeInTheDocument();

    expect(
      screen.queryByRole("button", {
        name: "Lihat respons penyedia",
      })
    ).not.toBeInTheDocument();

    expect(readCalls).not.toHaveBeenCalled();
  });
});

describe("SessionErrorSummary provider response", () => {
  const failedCall = failure({ attemptId: "a-1" });

  it("requests details only when selected", async () => {
    render(
      <SessionErrorSummary
        sessionId={SESSION_ID}
        failures={[failedCall]}
      />
    );

    await openTechnicalDetails();

    expect(readCalls).not.toHaveBeenCalled();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Lihat respons penyedia",
      })
    );

    expect(readCalls).toHaveBeenCalledWith(
      SESSION_ID,
      "a-1"
    );
  });

  it("shows the original response as text", async () => {
    render(
      <SessionErrorSummary
        sessionId={SESSION_ID}
        failures={[failedCall]}
      />
    );

    await openTechnicalDetails();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Lihat respons penyedia",
      })
    );

    const panel = await screen.findByRole("region", {
      name: "Respons penyedia",
    });

    expect(
      within(panel).getByText("Upaya ke-1")
    ).toBeInTheDocument();

    expect(
      within(panel).getByText("timeout")
    ).toBeInTheDocument();

    expect(
      within(panel).getByText("1,8 detik")
    ).toBeInTheDocument();

    expect(
      within(panel).getByText("HTTP 504 dari penyedia")
    ).toBeInTheDocument();

    expect(
      within(panel).getByText(/"code": 504/)
    ).toBeInTheDocument();
  });

  it("explains masked provider responses", async () => {
    readCalls.mockResolvedValue(
      detail({
        masked: true,
        calls: [
          {
            ...detail().calls[0],
            error_summary: null,
            raw_response: null,
          },
        ],
      })
    );

    render(
      <SessionErrorSummary
        sessionId={SESSION_ID}
        failures={[failedCall]}
      />
    );

    await openTechnicalDetails();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Lihat respons penyedia",
      })
    );

    expect(
      await screen.findByText(/Isi mentah disembunyikan/)
    ).toBeInTheDocument();
  });

  it("preserves failure information after an API error", async () => {
    readCalls.mockRejectedValue(
      new ApiError(404, "ATTEMPT_NOT_FOUND")
    );

    render(
      <SessionErrorSummary
        sessionId={SESSION_ID}
        failures={[failedCall]}
      />
    );

    await openTechnicalDetails();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Lihat respons penyedia",
      })
    );

    expect(
      await screen.findByText(
        "Percobaan ini tidak ada di sesi tersebut."
      )
    ).toBeInTheDocument();

    expect(screen.getByText("PJK-001")).toBeInTheDocument();
  });

  it("can close the provider response", async () => {
    render(
      <SessionErrorSummary
        sessionId={SESSION_ID}
        failures={[failedCall]}
      />
    );

    await openTechnicalDetails();

    await userEvent.click(
      screen.getByRole("button", {
        name: "Lihat respons penyedia",
      })
    );

    await screen.findByRole("region", {
      name: "Respons penyedia",
    });

    await userEvent.click(
      screen.getByRole("button", {
        name: "Tutup respons penyedia",
      })
    );

    expect(
      screen.queryByRole("region", {
        name: "Respons penyedia",
      })
    ).not.toBeInTheDocument();
  });
});