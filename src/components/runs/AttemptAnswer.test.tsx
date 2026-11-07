import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { AnswerContext } from "@/lib/runs/sessionDetail";
import type { AttemptResult } from "@/types/measurement";

import { AttemptAnswer } from "./AttemptAnswer";

const CONTEXT: AnswerContext = { masked: false, sessionEnded: true, viewerRole: "admin" };

function attempt(overrides: Partial<AttemptResult> = {}): AttemptResult {
  return {
    id: "44444444-4444-4444-4444-444444444444",
    repetition_no: 2,
    status: "succeeded",
    answer_text: "## Kesimpulan\n\nIni **tebal**.",
    model_version: "model-qa-1",
    started_at: "2026-11-03T03:00:00Z",
    finished_at: "2026-11-03T03:00:42Z",
    ...overrides,
  };
}

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
}

afterEach(() => {
  Object.defineProperty(navigator, "clipboard", { value: undefined, configurable: true });
});

describe("AttemptAnswer (PBI-11 AC8)", () => {
  // Positive: header dan timestamp
  it("shows the attempt number, status and model version", () => {
    // Arrange
    const item = attempt();

    // Act
    render(<AttemptAnswer attempt={item} context={CONTEXT} />);

    // Assert
    const row = screen.getByRole("listitem", { name: "Percobaan 2" });
    expect(row).toHaveTextContent("Berhasil");
    expect(row).toHaveTextContent("model-qa-1");
  });

  it("shows start, finish and duration in WIB", () => {
    // Arrange
    const item = attempt();

    // Act
    render(<AttemptAnswer attempt={item} context={CONTEXT} />);

    // Assert
    expect(screen.getByText("Mulai")).toBeInTheDocument();
    expect(screen.getByText("Selesai")).toBeInTheDocument();
    expect(screen.getAllByText("03 Nov 2026, 10.00 WIB")).toHaveLength(2);
    expect(screen.getByText("42 dtk")).toBeInTheDocument();
  });

  it("says not started and not finished when the server sent null timestamps", () => {
    // Arrange
    const item = attempt({ started_at: null, finished_at: null, status: "pending", answer_text: null });

    // Act
    render(<AttemptAnswer attempt={item} context={CONTEXT} />);

    // Assert
    expect(screen.getByText("Belum dimulai")).toBeInTheDocument();
    expect(screen.getByText("Belum selesai")).toBeInTheDocument();
    expect(screen.queryByText("Durasi")).not.toBeInTheDocument();
  });

  // Positive: tampilan markdown dan teks mentah
  it("shows the answer as formatted markdown by default", () => {
    // Arrange
    const item = attempt();

    // Act
    render(<AttemptAnswer attempt={item} context={CONTEXT} />);

    // Assert
    expect(screen.getByRole("heading", { level: 2, name: "Kesimpulan" })).toBeInTheDocument();
    expect(screen.getByText("tebal").tagName).toBe("STRONG");
  });

  it("switches to the raw markdown text and back", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<AttemptAnswer attempt={attempt()} context={CONTEXT} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Teks mentah" }));

    // Assert
    expect(screen.queryByRole("heading", { name: "Kesimpulan" })).not.toBeInTheDocument();
    expect(screen.getByTestId("raw-answer")).toHaveTextContent("## Kesimpulan Ini **tebal**.");
    expect(screen.getByRole("button", { name: "Teks mentah" })).toHaveAttribute("aria-pressed", "true");

    // Act
    await user.click(screen.getByRole("button", { name: "Tampilan" }));

    // Assert
    expect(screen.getByRole("heading", { name: "Kesimpulan" })).toBeInTheDocument();
  });

  it("keeps raw html visible as literal text in the raw view and creates no element from it", async () => {
    // Arrange
    const user = userEvent.setup();
    const payload = '<img src=x onerror="alert(1)"> **tebal**';
    const { container } = render(<AttemptAnswer attempt={attempt({ answer_text: payload })} context={CONTEXT} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Teks mentah" }));

    // Assert
    expect(screen.getByTestId("raw-answer").textContent).toBe(payload);
    expect(container.querySelector("img")).toBeNull();
  });

  // Positive / Negative: salin
  it("copies the exact stored markdown, not the rendered text", async () => {
    // Arrange
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);
    render(<AttemptAnswer attempt={attempt()} context={CONTEXT} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Salin" }));

    // Assert
    expect(writeText).toHaveBeenCalledWith("## Kesimpulan\n\nIni **tebal**.");
    expect(await screen.findByRole("button", { name: "Tersalin" })).toBeInTheDocument();
  });

  it("tells the user when copying fails", async () => {
    // Arrange
    const user = userEvent.setup();
    stubClipboard(vi.fn().mockRejectedValue(new Error("denied")));
    render(<AttemptAnswer attempt={attempt()} context={CONTEXT} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Salin" }));

    // Assert
    expect(await screen.findByRole("status")).toHaveTextContent("Gagal menyalin, pilih teksnya lalu salin manual.");
  });

  // Negative / edge: tanpa jawaban
  it("shows the placeholder and no answer controls for a technical failure", () => {
    // Arrange
    const item = attempt({ status: "technical_failure", answer_text: null });

    // Act
    render(<AttemptAnswer attempt={item} context={CONTEXT} />);

    // Assert
    expect(screen.getByText("Gagal teknis, tidak ada jawaban.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salin" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Teks mentah" })).not.toBeInTheDocument();
  });

  it("shows the masked message and no answer controls for a hidden test case", () => {
    // Arrange
    const item = attempt({ answer_text: null });

    // Act
    render(<AttemptAnswer attempt={item} context={{ ...CONTEXT, masked: true, viewerRole: "developer_ai" }} />);

    // Assert
    expect(screen.getByText("Isi kasus test disembunyikan untuk Developer AI.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salin" })).not.toBeInTheDocument();
  });

  it("says the product sent an empty answer when the text is an empty string", () => {
    // Arrange
    const item = attempt({ answer_text: "" });

    // Act
    render(<AttemptAnswer attempt={item} context={CONTEXT} />);

    // Assert
    expect(screen.getByText("Produk mengirim jawaban kosong.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Salin" })).not.toBeInTheDocument();
  });
});
