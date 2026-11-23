import { describe, expect, it } from "vitest";
import { precheckFile } from "./importRules";

function csvFile(name: string, content = "title,question\n"): File {
  return new File([content], name, { type: "text/csv" });
}

describe("precheckFile", () => {
  // Positive: a .csv with content goes to the server, which does the real checks.
  it.each(["kasus-lama.csv", "KASUS.CSV", "migrasi tahap 1.v2.csv"])("lets %s through", (name) => {
    // Arrange
    const file = csvFile(name);

    // Act
    const problem = precheckFile(file);

    // Assert
    expect(problem).toBeNull();
  });

  // Negative: nothing chosen yet.
  it("asks for a file when none is chosen", () => {
    // Arrange / Act
    const problem = precheckFile(null);

    // Assert
    expect(problem).toBe("Pilih berkas CSV untuk diimpor.");
  });

  // Negative: same rule as the server (extension .csv, case-insensitive), with the Google Sheets hint.
  it.each(["kasus.xlsx", "kasus.csv.txt", "kasus", "kasus.tsv"])("rejects %s before uploading", (name) => {
    // Arrange
    const file = csvFile(name);

    // Act
    const problem = precheckFile(file);

    // Assert
    expect(problem).toBe(
      "Berkas harus berupa .csv. Dari Google Sheets: File > Download > Comma Separated Values (.csv).",
    );
  });

  // Edge: an empty file would only come back as a server error.
  it("rejects an empty .csv file", () => {
    // Arrange
    const file = csvFile("kosong.csv", "");

    // Act
    const problem = precheckFile(file);

    // Assert
    expect(problem).toBe("Berkas kosong. Ekspor ulang dari Google Sheets.");
  });

  // Edge: the extension is checked first, so an empty .xlsx gets the format hint, not "empty".
  it("reports the wrong format before the empty content", () => {
    // Arrange
    const file = csvFile("kosong.xlsx", "");

    // Act
    const problem = precheckFile(file);

    // Assert
    expect(problem).toMatch(/^Berkas harus berupa \.csv/);
  });
});
