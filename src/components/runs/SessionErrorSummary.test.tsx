import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { AttemptResult, SessionCaseResult } from "@/types/measurement";
import { SessionErrorSummary } from "./SessionErrorSummary";

function attempt(overrides: Partial<AttemptResult> = {}): AttemptResult {
  return {
    repetition_no: 1,
    status: "succeeded",
    answer_text: "jawaban",
    model_version: "gemini-2.0-flash",
    ...overrides,
  };
}

function kasus(overrides: Partial<SessionCaseResult> = {}): SessionCaseResult {
  return {
    snapshot_item_id: "11111111-1111-1111-1111-111111111111",
    case_id: "22222222-2222-2222-2222-222222222222",
    case_code: "PJK-001",
    title: "Pajak penghasilan karyawan",
    question: "Berapa tarif PPh 21?",
    split_tag: "dev",
    masked: false,
    version_no: 3,
    sections: null,
    attempts: [],
    ...overrides,
  };
}

const gagal = { status: "technical_failure", answer_text: null } as const;

const satuGagal = [kasus({ attempts: [attempt(), attempt({ repetition_no: 2, ...gagal })] })];

describe("SessionErrorSummary (PBI-12 AC4)", () => {
  it("stays out of the way when nothing failed", () => {
    const { container } = render(<SessionErrorSummary cases={[kasus({ attempts: [attempt()] })]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the plain summary first", () => {
    render(<SessionErrorSummary cases={satuGagal} />);

    expect(screen.getByText("1 panggilan gagal karena masalah teknis")).toBeInTheDocument();
  });

  it("keeps the technical detail out of sight until it is asked for", () => {
    render(<SessionErrorSummary cases={satuGagal} />);

    expect(screen.queryByText("PJK-001")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lihat detail teknis" })).toHaveAttribute("aria-expanded", "false");
  });

  it("names the case, the repetition and the model version once the button is pressed", async () => {
    render(<SessionErrorSummary cases={satuGagal} />);

    await userEvent.click(screen.getByRole("button", { name: "Lihat detail teknis" }));

    expect(screen.getByText("PJK-001")).toBeInTheDocument();
    expect(screen.getByText("Pengulangan ke-2")).toBeInTheDocument();
    expect(screen.getByText("Model gemini-2.0-flash")).toBeInTheDocument();
  });

  it("says the provider's own message is not there yet, so nobody waits for it", async () => {
    render(<SessionErrorSummary cases={satuGagal} />);

    await userEvent.click(screen.getByRole("button", { name: "Lihat detail teknis" }));

    expect(screen.getByText(/Pesan asli dari penyedia belum dikirim/)).toBeInTheDocument();
  });

  it("says Tidak tercatat when the model version is missing", async () => {
    render(
      <SessionErrorSummary cases={[kasus({ attempts: [attempt({ ...gagal, model_version: null })] })]} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Lihat detail teknis" }));

    expect(screen.getByText("Model Tidak tercatat")).toBeInTheDocument();
  });

  it("closes the detail again", async () => {
    render(<SessionErrorSummary cases={satuGagal} />);

    await userEvent.click(screen.getByRole("button", { name: "Lihat detail teknis" }));
    await userEvent.click(screen.getByRole("button", { name: "Sembunyikan detail teknis" }));

    expect(screen.queryByText("PJK-001")).not.toBeInTheDocument();
  });
});