import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { saveBlob } from "@/lib/browserDownload";
import type { ReportsGateway } from "@/lib/reports/reportsApi";
import { firstReport } from "@/test/reportFixtures";

import { ReportPdfActions } from "./ReportPdfActions";

vi.mock("@/lib/browserDownload", () => ({ saveBlob: vi.fn() }));

const REPORT_ID = "8f1c2d3e-0000-4000-8000-000000000001";
const pdfFile = new Blob(["%PDF-1.4"], { type: "application/pdf" });

function gatewayWith(pdf: ReportsGateway["pdf"]): ReportsGateway {
  return {
    list: vi.fn(),
    detail: vi.fn().mockResolvedValue(firstReport()),
    pdf,
    eligibleSessions: vi.fn(),
    create: vi.fn(),
    validate: vi.fn(),
  };
}

const createObjectURL = vi.fn(() => "blob:report-pdf");
const revokeObjectURL = vi.fn();

beforeEach(() => {
  Object.assign(URL, { createObjectURL, revokeObjectURL });
});

afterEach(() => {
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  vi.mocked(saveBlob).mockClear();
  Reflect.deleteProperty(navigator, "pdfViewerEnabled");
});

// SCRUM-322 (Fase 0 K5): the reader sees the real server PDF before downloading it, because the web chart is
// horizontal and the PDF chart is vertical (K4). Devices that cannot show a PDF in the page only get Download.
describe("ReportPdfActions: which buttons appear", () => {
  it("offers preview and download where the browser can show a PDF", () => {
    render(<ReportPdfActions reportId={REPORT_ID} gateway={gatewayWith(vi.fn())} canPreview />);
    expect(screen.getByRole("button", { name: "Pratinjau PDF" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Unduh PDF" })).toBeInTheDocument();
  });

  it("offers only the download, with a reason, where it cannot", () => {
    render(<ReportPdfActions reportId={REPORT_ID} gateway={gatewayWith(vi.fn())} canPreview={false} />);
    expect(screen.queryByRole("button", { name: "Pratinjau PDF" })).toBeNull();
    expect(screen.getByText("Pratinjau PDF tidak didukung di perangkat ini.")).toBeInTheDocument();
  });

  // The server cannot know the reader's browser, so its HTML never offers the preview. The browser adds the
  // button after hydration if it can show PDFs, instead of the server guessing and causing a mismatch.
  it("renders only the download on the server, whatever the browser can do", () => {
    Object.defineProperty(navigator, "pdfViewerEnabled", { value: true, configurable: true });
    const html = renderToString(<ReportPdfActions reportId={REPORT_ID} gateway={gatewayWith(vi.fn())} />);
    expect(html).toContain("Unduh PDF");
    expect(html).not.toContain("Pratinjau PDF</button>");
  });

  // Without the prop the component asks the browser itself (navigator.pdfViewerEnabled).
  it.each([
    [true, true],
    [false, false],
  ])("follows navigator.pdfViewerEnabled = %s", (enabled, shown) => {
    Object.defineProperty(navigator, "pdfViewerEnabled", { value: enabled, configurable: true });
    render(<ReportPdfActions reportId={REPORT_ID} gateway={gatewayWith(vi.fn())} />);
    expect(screen.queryByRole("button", { name: "Pratinjau PDF" }) !== null).toBe(shown);
  });
});

describe("ReportPdfActions: download", () => {
  it("saves the server PDF under the report id", async () => {
    const pdf = vi.fn().mockResolvedValue(pdfFile);
    render(<ReportPdfActions reportId={REPORT_ID} gateway={gatewayWith(pdf)} canPreview={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Unduh PDF" }));

    await waitFor(() => expect(saveBlob).toHaveBeenCalledWith(pdfFile, `laporan-${REPORT_ID}.pdf`));
    expect(pdf).toHaveBeenCalledWith(REPORT_ID);
  });

  it("asks the server only once for repeated downloads", async () => {
    const pdf = vi.fn().mockResolvedValue(pdfFile);
    render(<ReportPdfActions reportId={REPORT_ID} gateway={gatewayWith(pdf)} canPreview={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Unduh PDF" }));
    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole("button", { name: "Unduh PDF" }));

    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(2));
    expect(pdf).toHaveBeenCalledTimes(1);
  });

  it("explains a failed download and saves nothing", async () => {
    const pdf = vi.fn().mockRejectedValue(new ApiError(500, "ANY"));
    render(<ReportPdfActions reportId={REPORT_ID} gateway={gatewayWith(pdf)} canPreview={false} />);

    await userEvent.click(screen.getByRole("button", { name: "Unduh PDF" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("PDF gagal dimuat. Coba lagi.");
    expect(saveBlob).not.toHaveBeenCalled();
  });
});

describe("ReportPdfActions: preview", () => {
  it("shows the real PDF in a dialog once it has loaded", async () => {
    let resolve: (file: Blob) => void = () => {};
    const pdf = vi.fn(() => new Promise<Blob>((done) => (resolve = done)));
    render(<ReportPdfActions reportId={REPORT_ID} gateway={gatewayWith(pdf)} canPreview />);

    await userEvent.click(screen.getByRole("button", { name: "Pratinjau PDF" }));
    const dialog = screen.getByRole("dialog", { name: "Pratinjau PDF" });
    expect(within(dialog).getByRole("status")).toHaveTextContent("Menyiapkan PDF…");

    resolve(pdfFile);
    const frame = await within(dialog).findByTitle("Pratinjau PDF laporan");
    expect(frame).toHaveAttribute("src", "blob:report-pdf");
    expect(createObjectURL).toHaveBeenCalledWith(pdfFile);
  });

  it("downloads from the dialog without asking the server again", async () => {
    const pdf = vi.fn().mockResolvedValue(pdfFile);
    render(<ReportPdfActions reportId={REPORT_ID} gateway={gatewayWith(pdf)} canPreview />);

    await userEvent.click(screen.getByRole("button", { name: "Pratinjau PDF" }));
    const dialog = screen.getByRole("dialog", { name: "Pratinjau PDF" });
    await within(dialog).findByTitle("Pratinjau PDF laporan");
    await userEvent.click(within(dialog).getByRole("button", { name: "Unduh PDF" }));

    await waitFor(() => expect(saveBlob).toHaveBeenCalledWith(pdfFile, `laporan-${REPORT_ID}.pdf`));
    expect(pdf).toHaveBeenCalledTimes(1);
  });

  it("closes the dialog and frees the PDF from memory", async () => {
    render(<ReportPdfActions reportId={REPORT_ID} gateway={gatewayWith(vi.fn().mockResolvedValue(pdfFile))} canPreview />);

    await userEvent.click(screen.getByRole("button", { name: "Pratinjau PDF" }));
    const dialog = screen.getByRole("dialog", { name: "Pratinjau PDF" });
    await within(dialog).findByTitle("Pratinjau PDF laporan");
    await userEvent.click(within(dialog).getByRole("button", { name: "Tutup" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:report-pdf");
  });

  it("closes on Escape like the other dialogs", async () => {
    render(<ReportPdfActions reportId={REPORT_ID} gateway={gatewayWith(vi.fn().mockResolvedValue(pdfFile))} canPreview />);

    await userEvent.click(screen.getByRole("button", { name: "Pratinjau PDF" }));
    const dialog = screen.getByRole("dialog", { name: "Pratinjau PDF" });
    await within(dialog).findByTitle("Pratinjau PDF laporan");
    fireEvent(dialog, new Event("cancel", { cancelable: true }));

    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // Edge: the reader closes the dialog before the PDF arrives. The late file must not open an orphan URL.
  it("does not keep a PDF that arrives after the dialog was closed", async () => {
    let resolve: (file: Blob) => void = () => {};
    const pdf = vi.fn(() => new Promise<Blob>((done) => (resolve = done)));
    render(<ReportPdfActions reportId={REPORT_ID} gateway={gatewayWith(pdf)} canPreview />);

    await userEvent.click(screen.getByRole("button", { name: "Pratinjau PDF" }));
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Tutup" }));
    resolve(pdfFile);

    await waitFor(() => expect(screen.getByRole("button", { name: "Pratinjau PDF" })).toBeEnabled());
    expect(createObjectURL).not.toHaveBeenCalled();
  });

  // D9: a hidden report reads the same in the PDF dialog, and the reader can try again.
  it("explains a failed preview and loads again on retry", async () => {
    const pdf = vi.fn().mockRejectedValueOnce(new ApiError(403, "ANY")).mockResolvedValueOnce(pdfFile);
    render(<ReportPdfActions reportId={REPORT_ID} gateway={gatewayWith(pdf)} canPreview />);

    await userEvent.click(screen.getByRole("button", { name: "Pratinjau PDF" }));
    const dialog = screen.getByRole("dialog", { name: "Pratinjau PDF" });
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Laporan tidak ditemukan atau Anda tidak punya akses untuk membukanya.",
    );

    await userEvent.click(within(dialog).getByRole("button", { name: "Coba lagi" }));
    expect(await within(dialog).findByTitle("Pratinjau PDF laporan")).toBeInTheDocument();
    expect(pdf).toHaveBeenCalledTimes(2);
  });

  it("frees the PDF when the page goes away with the dialog open", async () => {
    const { unmount } = render(
      <ReportPdfActions reportId={REPORT_ID} gateway={gatewayWith(vi.fn().mockResolvedValue(pdfFile))} canPreview />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Pratinjau PDF" }));
    await screen.findByTitle("Pratinjau PDF laporan");
    unmount();

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:report-pdf");
  });
});
