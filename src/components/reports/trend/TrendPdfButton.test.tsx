import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { saveBlob } from "@/lib/browserDownload";
import { ApiError } from "@/lib/apiClient";
import type { TrendGateway, TrendQuery } from "@/lib/reports/trend/trendApi";

import { TrendPdfButton } from "./TrendPdfButton";

vi.mock("@/lib/browserDownload", () => ({ saveBlob: vi.fn() }));

const QUERY: TrendQuery = {
  productId: "11111111-1111-4111-8111-111111111111",
  scope: "test",
  metric: "total",
  range: "all",
};

function gatewayWith(pdf: TrendGateway["pdf"]): TrendGateway {
  return { get: vi.fn(), pdf };
}

beforeEach(() => {
  vi.mocked(saveBlob).mockReset();
});

describe("TrendPdfButton (AC8)", () => {
  // Positive
  it("downloads the PDF for the filters on screen under a name that holds all of them", async () => {
    // Arrange
    const user = userEvent.setup();
    const file = new Blob(["%PDF-1.7"], { type: "application/pdf" });
    const pdf = vi.fn().mockResolvedValue(file);
    render(<TrendPdfButton query={{ ...QUERY, metric: "llm", range: "6m" }} gateway={gatewayWith(pdf)} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Unduh PDF" }));

    // Assert
    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(1));
    expect(pdf).toHaveBeenCalledWith({ ...QUERY, metric: "llm", range: "6m" });
    expect(saveBlob).toHaveBeenCalledWith(file, "tren-11111111-1111-4111-8111-111111111111-test-llm-6m.pdf");
  });

  // Edge case
  it("disables the button while the PDF is being prepared, so a second click sends no second request", async () => {
    // Arrange
    const user = userEvent.setup();
    let finish: (file: Blob) => void = () => undefined;
    const pdf = vi.fn().mockReturnValue(
      new Promise<Blob>((resolve) => {
        finish = resolve;
      }),
    );
    render(<TrendPdfButton query={QUERY} gateway={gatewayWith(pdf)} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Unduh PDF" }));
    const busy = screen.getByRole("button", { name: "Menyiapkan PDF…" });
    await user.click(busy);

    // Assert
    expect(busy).toBeDisabled();
    expect(pdf).toHaveBeenCalledTimes(1);
    finish(new Blob());
    await waitFor(() => expect(screen.getByRole("button", { name: "Unduh PDF" })).toBeEnabled());
  });

  // Negative
  it("explains a refused case type and saves nothing", async () => {
    // Arrange
    const user = userEvent.setup();
    const pdf = vi.fn().mockRejectedValue(new ApiError(403, "TREND_SCOPE_FORBIDDEN"));
    render(<TrendPdfButton query={{ ...QUERY, scope: "dev" }} gateway={gatewayWith(pdf)} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Unduh PDF" }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Peran Anda hanya boleh melihat tren skor test.");
    expect(saveBlob).not.toHaveBeenCalled();
  });

  // Negative
  it("shows a retry message for a failure it cannot explain and lets the reader try again", async () => {
    // Arrange
    const user = userEvent.setup();
    const file = new Blob(["%PDF-1.7"]);
    const pdf = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(file);
    render(<TrendPdfButton query={QUERY} gateway={gatewayWith(pdf)} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Unduh PDF" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("PDF tren gagal dimuat. Coba lagi.");
    await user.click(screen.getByRole("button", { name: "Unduh PDF" }));

    // Assert
    await waitFor(() => expect(saveBlob).toHaveBeenCalledWith(file, expect.stringMatching(/\.pdf$/)));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
