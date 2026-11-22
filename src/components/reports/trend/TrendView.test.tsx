import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import type { TrendGateway } from "@/lib/reports/trend/trendApi";
import { eligibleSession } from "@/test/reportFixtures";
import { trendPoint, trendRead } from "@/test/trendFixtures";
import type { Role } from "@/types";

import { TrendView } from "./TrendView";

const { useAuthMock } = vi.hoisted(() => ({ useAuthMock: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: useAuthMock }));
vi.mock("@/lib/browserDownload", () => ({ saveBlob: vi.fn() }));

// PBI-17 (SCRUM-334): the page wires the hooks (tested on their own) to the screen. These tests check what the
// reader sees and picks: the product list, the filters each role gets, the request each pick sends, and every
// state of the trend (loading, empty, error, warning, chart).

const SESSIONS = [
  eligibleSession({ product_id: "p-b", product_name: "Bravo" }),
  eligibleSession({ product_id: "p-a", product_name: "AiYU" }),
];

const trendGateway: { get: ReturnType<typeof vi.fn>; pdf: ReturnType<typeof vi.fn> } = {
  get: vi.fn(),
  pdf: vi.fn(),
};
const eligibleSessions = vi.fn();

function signedInAs(role: Role) {
  useAuthMock.mockReturnValue({
    status: "authenticated",
    user: { id: "u-1", name: "Uji", email: "u@veritask.test", role },
  });
}

function renderView() {
  return render(<TrendView trendGateway={trendGateway as unknown as TrendGateway} reportsGateway={{ eligibleSessions }} />);
}

beforeEach(() => {
  trendGateway.get.mockReset().mockResolvedValue(trendRead());
  trendGateway.pdf.mockReset().mockResolvedValue(new Blob(["%PDF"]));
  eligibleSessions.mockReset().mockResolvedValue(SESSIONS);
  useAuthMock.mockReset();
});

describe("TrendView before there is anything to show", () => {
  // Edge case
  it("waits for the role before showing anything or asking for data", () => {
    // Arrange
    useAuthMock.mockReturnValue({ status: "loading" });

    // Act
    renderView();

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent("Memuat…");
    expect(eligibleSessions).not.toHaveBeenCalled();
    expect(trendGateway.get).not.toHaveBeenCalled();
  });

  // Edge case
  it("asks for nothing once the session has ended", () => {
    // Arrange
    useAuthMock.mockReturnValue({ status: "unauthenticated", reason: "expired" });

    // Act
    renderView();

    // Assert
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(eligibleSessions).not.toHaveBeenCalled();
  });

  // Positive
  it("shows a loading state while the product list is on its way", () => {
    // Arrange
    signedInAs("admin");
    eligibleSessions.mockReturnValue(new Promise(() => undefined));

    // Act
    renderView();

    // Assert
    expect(screen.getByRole("heading", { level: 1, name: "Tren kualitas produk" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Memuat produk…");
  });

  // Negative
  it("shows an error with a retry button when the product list fails, and retry loads it again", async () => {
    // Arrange
    const user = userEvent.setup();
    signedInAs("admin");
    eligibleSessions.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    renderView();
    expect(await screen.findByRole("alert")).toHaveTextContent("Daftar produk gagal dimuat. Coba lagi.");

    // Act
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(await screen.findByLabelText("Produk")).toHaveValue("p-a");
    expect(eligibleSessions).toHaveBeenCalledTimes(2);
  });

  // Edge case
  it("says nothing was measured yet when there are no products, and asks for no trend", async () => {
    // Arrange
    signedInAs("admin");
    eligibleSessions.mockResolvedValue([]);

    // Act
    renderView();

    // Assert
    expect(await screen.findByText("Belum ada produk yang diukur")).toBeInTheDocument();
    expect(trendGateway.get).not.toHaveBeenCalled();
  });
});

describe("TrendView requests", () => {
  // Positive
  it("opens on the first product by name with the defaults: test only, total score, all months (AC2, AC3, AC12)", async () => {
    // Arrange
    signedInAs("admin");

    // Act
    renderView();

    // Assert
    expect(await screen.findByRole("table", { name: "Skor total AiYU per bulan" })).toBeInTheDocument();
    expect(trendGateway.get).toHaveBeenCalledWith({ productId: "p-a", scope: "test", metric: "total", range: "all" });
    expect(screen.getByLabelText("Jenis kasus")).toHaveValue("test");
  });

  // Positive
  it("sends a new request for each product, metric and range the reader picks (AC2, AC3)", async () => {
    // Arrange
    const user = userEvent.setup();
    signedInAs("viewer");
    renderView();
    await screen.findByRole("table");

    // Act
    await user.selectOptions(screen.getByLabelText("Produk"), "p-b");
    await user.selectOptions(screen.getByLabelText("Metrik"), "deterministic");
    await user.selectOptions(screen.getByLabelText("Rentang waktu"), "12m");

    // Assert
    await waitFor(() =>
      expect(trendGateway.get).toHaveBeenLastCalledWith({
        productId: "p-b",
        scope: "test",
        metric: "deterministic",
        range: "12m",
      }),
    );
  });

  // Positive
  it.each<Role>(["admin", "developer_ai"])("lets %s ask for dev only and for all case types (AC12, AC13)", async (role) => {
    // Arrange
    const user = userEvent.setup();
    signedInAs(role);
    renderView();
    await screen.findByRole("table");

    // Act
    await user.selectOptions(screen.getByLabelText("Jenis kasus"), "dev");
    await waitFor(() => expect(trendGateway.get).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "dev" })));
    await user.selectOptions(screen.getByLabelText("Jenis kasus"), "dev_test");

    // Assert
    await waitFor(() => expect(trendGateway.get).toHaveBeenLastCalledWith(expect.objectContaining({ scope: "dev_test" })));
  });

  // Negative
  it.each<Role>(["viewer", "contributor"])("shows %s no case type filter and only ever asks for test scores (AC1, AC12)", async (role) => {
    // Arrange
    signedInAs(role);

    // Act
    renderView();

    // Assert
    await screen.findByRole("table");
    expect(screen.queryByLabelText("Jenis kasus")).not.toBeInTheDocument();
    expect(trendGateway.get).toHaveBeenCalledTimes(1);
    expect(trendGateway.get).toHaveBeenCalledWith(expect.objectContaining({ scope: "test" }));
  });
});

describe("TrendView result states", () => {
  // Positive
  it("shows a loading state while the trend is on its way", async () => {
    // Arrange
    signedInAs("admin");
    trendGateway.get.mockReturnValue(new Promise(() => undefined));

    // Act
    renderView();

    // Assert
    expect(await screen.findByText("Memuat tren…")).toBeInTheDocument();
  });

  // Positive
  it("draws the chart and the table, with the dashed line and the reason at a version change (AC5)", async () => {
    // Arrange
    signedInAs("admin");
    trendGateway.get.mockResolvedValue(
      trendRead({
        points: [
          trendPoint({ month: "2026-09-01", value: "0.80" }),
          trendPoint({ month: "2026-10-01", value: "0.85", breaks: ["RUBRIC_VERSION"], markers: ["REPETITIONS_DIFFER"] }),
        ],
      }),
    );

    // Act
    const { container } = renderView();

    // Assert
    const table = await screen.findByRole("table");
    expect(within(table).getByText("Versi rubrik penilaian berbeda")).toBeInTheDocument();
    expect(within(table).getByText("Jumlah percobaan berbeda")).toBeInTheDocument();
    expect(container.querySelectorAll("circle[data-point]")).toHaveLength(2);
    expect(container.querySelector("line[data-dashed='true']")).not.toBeNull();
    expect(screen.getByRole("button", { name: "Unduh PDF" })).toBeInTheDocument();
  });

  // Negative
  it("shows the warning and draws no line when there are no shared cases (AC11)", async () => {
    // Arrange
    signedInAs("admin");
    trendGateway.get.mockResolvedValue(
      trendRead({
        points: [trendPoint({ value: null, case_count: 0 }), trendPoint({ month: "2026-10-01", value: null, case_count: 0 })],
        warnings: ["NO_SHARED_CASES"],
      }),
    );

    // Act
    const { container } = renderView();

    // Assert
    const warning = await screen.findByText("Tidak ada kasus yang sama antar sesi, jadi garis tren tidak digambar.");
    expect(warning.closest("[role='status']")).not.toBeNull();
    expect(container.querySelectorAll("circle[data-point]")).toHaveLength(0);
    expect(container.querySelectorAll("line[data-segment]")).toHaveLength(0);
  });

  // Edge case
  it("keeps drawing the other line and still warns when only part of the months has no shared cases", async () => {
    // Arrange
    signedInAs("admin");
    trendGateway.get.mockResolvedValue(
      trendRead({
        points: [trendPoint({ value: "0.80" }), trendPoint({ month: "2026-10-01", value: null, case_count: 0 })],
        warnings: ["NO_SHARED_CASES"],
      }),
    );

    // Act
    const { container } = renderView();

    // Assert
    await screen.findByText(/Tidak ada kasus yang sama/);
    expect(container.querySelectorAll("circle[data-point]")).toHaveLength(1);
  });

  // Edge case
  it("says there is no trend yet for a product with no eligible session", async () => {
    // Arrange
    signedInAs("admin");
    trendGateway.get.mockResolvedValue(trendRead({ points: [] }));

    // Act
    renderView();

    // Assert
    expect(await screen.findByText("Belum ada tren")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Unduh PDF" })).not.toBeInTheDocument();
  });

  // Negative
  it("explains a refused case type with the role message, and retry asks again", async () => {
    // Arrange
    const user = userEvent.setup();
    signedInAs("admin");
    trendGateway.get.mockRejectedValueOnce(new ApiError(403, "TREND_SCOPE_FORBIDDEN"));
    renderView();
    expect(await screen.findByRole("alert")).toHaveTextContent("Peran Anda hanya boleh melihat tren skor test.");

    // Act
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(await screen.findByRole("table")).toBeInTheDocument();
    expect(trendGateway.get).toHaveBeenCalledTimes(2);
  });

  // Positive
  it("downloads the PDF for the filters that are on screen (AC8)", async () => {
    // Arrange
    const user = userEvent.setup();
    signedInAs("admin");
    renderView();
    await screen.findByRole("table");
    await user.selectOptions(screen.getByLabelText("Metrik"), "llm");
    await waitFor(() => expect(trendGateway.get).toHaveBeenLastCalledWith(expect.objectContaining({ metric: "llm" })));
    await screen.findByRole("table", { name: "Penilai LLM AiYU per bulan" });

    // Act
    await user.click(screen.getByRole("button", { name: "Unduh PDF" }));

    // Assert
    await waitFor(() =>
      expect(trendGateway.pdf).toHaveBeenCalledWith({ productId: "p-a", scope: "test", metric: "llm", range: "all" }),
    );
  });
});
