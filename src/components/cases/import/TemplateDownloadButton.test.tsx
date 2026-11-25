import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import type { ImportGateway } from "@/lib/cases/importApi";
import { TemplateDownloadButton } from "./TemplateDownloadButton";

/**
 * Isolation: the gateway is a prop, so a vi.fn stands in for the network (no fetch at all), and saveBlob is
 * vi.mock'ed because jsdom cannot save a file.
 */
const { saveBlobMock } = vi.hoisted(() => ({ saveBlobMock: vi.fn() }));
vi.mock("@/lib/browserDownload", () => ({ saveBlob: saveBlobMock }));

const TEMPLATE = new Blob(["\uFEFFtitle,question\r\n"], { type: "text/csv" });

function gatewayWith(downloadTemplate: ImportGateway["downloadTemplate"]): Pick<ImportGateway, "downloadTemplate"> {
  return { downloadTemplate };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

beforeEach(() => {
  saveBlobMock.mockReset();
});

describe("TemplateDownloadButton (AC6)", () => {
  // Positive: the server's file is saved under the template name.
  it("downloads the template from the server and saves it as template-impor-kasus.csv", async () => {
    // Arrange
    const download = vi.fn().mockResolvedValue(TEMPLATE);
    render(<TemplateDownloadButton gateway={gatewayWith(download)} />);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Unduh template CSV" }));

    // Assert
    expect(download).toHaveBeenCalledTimes(1);
    expect(saveBlobMock).toHaveBeenCalledWith(TEMPLATE, "template-impor-kasus.csv");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // Edge: while the request runs the button says so and cannot be pressed again.
  it("disables the button while downloading and ignores a second click", async () => {
    // Arrange
    const pending = deferred<Blob>();
    const download = vi.fn().mockReturnValue(pending.promise);
    render(<TemplateDownloadButton gateway={gatewayWith(download)} />);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Unduh template CSV" }));
    const busy = screen.getByRole("button", { name: "Mengunduh…" });
    await userEvent.click(busy);

    // Assert
    expect(busy).toBeDisabled();
    expect(download).toHaveBeenCalledTimes(1);
    pending.resolve(TEMPLATE);
    expect(await screen.findByRole("button", { name: "Unduh template CSV" })).toBeEnabled();
    expect(saveBlobMock).toHaveBeenCalledTimes(1);
  });

  // Negative: a refused role sees why, and nothing is saved.
  it("shows the role message when the server refuses", async () => {
    // Arrange
    const download = vi.fn().mockRejectedValue(new ApiError(403, "FORBIDDEN", "Forbidden"));
    render(<TemplateDownloadButton gateway={gatewayWith(download)} />);

    // Act
    await userEvent.click(screen.getByRole("button", { name: "Unduh template CSV" }));

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Hanya Kontributor dan Admin yang boleh mengimpor kasus.");
    expect(saveBlobMock).not.toHaveBeenCalled();
  });

  // Negative then positive: a network failure can be retried, and the old message goes away.
  it("lets the user retry after a network failure", async () => {
    // Arrange
    const download = vi.fn().mockRejectedValueOnce(new TypeError("Failed to fetch")).mockResolvedValueOnce(TEMPLATE);
    render(<TemplateDownloadButton gateway={gatewayWith(download)} />);
    const button = screen.getByRole("button", { name: "Unduh template CSV" });

    // Act
    await userEvent.click(button);
    expect(await screen.findByRole("alert")).toHaveTextContent("Tidak bisa terhubung ke server.");
    await userEvent.click(screen.getByRole("button", { name: "Unduh template CSV" }));

    // Assert
    expect(download).toHaveBeenCalledTimes(2);
    expect(saveBlobMock).toHaveBeenCalledWith(TEMPLATE, "template-impor-kasus.csv");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
