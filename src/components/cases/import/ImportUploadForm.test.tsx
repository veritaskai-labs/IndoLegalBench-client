import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/apiClient";
import type { ImportGateway } from "@/lib/cases/importApi";
import type { ImportSummary } from "@/types/caseImport";
import { ImportUploadForm } from "./ImportUploadForm";

/**
 * Isolation: the gateway is a vi.fn prop (no network), files are real File objects given to the input with
 * userEvent.upload. applyAccept is off where a test needs a non-.csv file to reach the pre-check, the way a
 * user can pick "All files" in the file dialog.
 */
const SUMMARY: ImportSummary = {
  batch_id: "b-1",
  file_name: "kasus.csv",
  imported_by: "u-1",
  imported_at: "2026-11-23T14:00:00Z",
  suite_id: "s-1",
  suite_name: "Impor CSV",
  total_rows: 1,
  success_count: 1,
  failed_count: 0,
  skipped_count: 0,
  rows: [{ row_no: 2, status: "created", case_id: "c-1", case_code: "IMPOR-B1-002", reason: null }],
};

function csv(name = "kasus.csv", content = "title,question\r\nJudul contoh,Pertanyaan contoh\r\n"): File {
  return new File([content], name, { type: "text/csv" });
}

function setup(uploadCsv: ImportGateway["uploadCsv"] = vi.fn().mockResolvedValue(SUMMARY)) {
  const onImported = vi.fn();
  const user = userEvent.setup({ applyAccept: false });
  render(<ImportUploadForm gateway={{ uploadCsv }} onImported={onImported} />);
  return { user, onImported, uploadCsv, input: screen.getByLabelText("Berkas CSV") };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("ImportUploadForm (AC4)", () => {
  // Positive: the browser offers CSV files first.
  it("asks for one CSV file", () => {
    // Arrange / Act
    const { input } = setup();

    // Assert
    expect(input).toHaveAttribute("type", "file");
    expect(input).toHaveAttribute("accept", ".csv,text/csv");
    expect(input).not.toHaveAttribute("multiple");
  });

  // Positive: the chosen file goes to the server and the summary goes to the page.
  it("uploads the chosen file and hands the summary to the page", async () => {
    // Arrange
    const { user, onImported, uploadCsv, input } = setup();
    const file = csv();

    // Act
    await user.upload(input, file);
    await user.click(screen.getByRole("button", { name: "Impor" }));

    // Assert
    expect(screen.getByText("Dipilih: kasus.csv")).toBeInTheDocument();
    expect(uploadCsv).toHaveBeenCalledWith(file);
    expect(onImported).toHaveBeenCalledWith(SUMMARY);
  });

  // Negative: pre-check messages, nothing is sent.
  it("asks for a file when Impor is pressed without one", async () => {
    // Arrange
    const { user, uploadCsv } = setup();

    // Act
    await user.click(screen.getByRole("button", { name: "Impor" }));

    // Assert
    expect(screen.getByRole("alert")).toHaveTextContent("Pilih berkas CSV untuk diimpor.");
    expect(uploadCsv).not.toHaveBeenCalled();
  });

  it.each([
    ["kasus.xlsx", "title", "Berkas harus berupa .csv."],
    ["kosong.csv", "", "Berkas kosong."],
  ])("stops %s before uploading", async (name, content, message) => {
    // Arrange
    const { user, uploadCsv, input } = setup();

    // Act
    await user.upload(input, csv(name, content));
    await user.click(screen.getByRole("button", { name: "Impor" }));

    // Assert
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(uploadCsv).not.toHaveBeenCalled();
  });

  // Edge: choosing another file clears the old pre-check message.
  it("clears the pre-check message when another file is chosen", async () => {
    // Arrange
    const { user, input } = setup();
    await user.click(screen.getByRole("button", { name: "Impor" }));

    // Act
    await user.upload(input, csv());

    // Assert
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // Edge: the upload can take up to 30 s; a second press must not send the file twice.
  it("shows progress, locks the form and ignores a second press while uploading", async () => {
    // Arrange
    const pending = deferred<ImportSummary>();
    const { user, uploadCsv, onImported, input } = setup(vi.fn().mockReturnValue(pending.promise));
    await user.upload(input, csv());

    // Act
    await user.click(screen.getByRole("button", { name: "Impor" }));
    const busy = screen.getByRole("button", { name: "Mengimpor…" });
    await user.click(busy);

    // Assert
    expect(busy).toBeDisabled();
    expect(input).toBeDisabled();
    expect(screen.getByRole("status")).toHaveTextContent("Mengimpor berkas. Ini bisa sampai 30 detik, jangan tutup halaman.");
    expect(uploadCsv).toHaveBeenCalledTimes(1);
    pending.resolve(SUMMARY);
    expect(await screen.findByRole("button", { name: "Impor" })).toBeEnabled();
    expect(onImported).toHaveBeenCalledTimes(1);
  });

  // Negative: whole file rejected; the reason is the server's and the file stays chosen for a retry.
  it("explains a whole-file rejection and keeps the file chosen", async () => {
    // Arrange
    const refusal = new ApiError(
      422,
      "IMPORT_HEADER_MISMATCH",
      "Header tidak sama dengan template. Pakai template dari sistem, pemisah koma, dan jangan mengubah nama atau urutan kolom.",
    );
    const { user, onImported, input } = setup(vi.fn().mockRejectedValue(refusal));
    await user.upload(input, csv());

    // Act
    await user.click(screen.getByRole("button", { name: "Impor" }));

    // Assert
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Berkas ditolak, tidak ada kasus yang disimpan.");
    expect(alert).toHaveTextContent("Header tidak sama dengan template.");
    expect(screen.getByText("Dipilih: kasus.csv")).toBeInTheDocument();
    expect(onImported).not.toHaveBeenCalled();
  });

  // Negative: a network error is not called a rejection (rows may already be stored).
  it("does not call a network failure a rejected file", async () => {
    // Arrange
    const { user, input } = setup(vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    await user.upload(input, csv());

    // Act
    await user.click(screen.getByRole("button", { name: "Impor" }));

    // Assert
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Tidak bisa terhubung ke server.");
    expect(alert).not.toHaveTextContent("Berkas ditolak");
  });

  // Edge: the file name is the user's text and is shown as text, never as markup.
  it("shows a file name with markup as plain text", async () => {
    // Arrange
    const { user, input } = setup();

    // Act
    await user.upload(input, csv('<img src=x onerror="alert(1)">.csv'));

    // Assert
    expect(screen.getByText('Dipilih: <img src=x onerror="alert(1)">.csv')).toBeInTheDocument();
    expect(document.querySelector("img")).toBeNull();
  });
});
