import { describe, expect, it } from "vitest";

import type { RubricVersionSummary } from "@/types/rubric";
import { latestVersion, nextVersionNo, sortNewestFirst, toVersionRow, versionRangeText } from "./rubricVersion";

function version(overrides: Partial<RubricVersionSummary> = {}): RubricVersionSummary {
  return {
    id: "v-1",
    version_no: 1,
    effective_date: "2026-10-27",
    is_active: true,
    created_by: "u-1",
    approved_by_name: "Steven & Deanne",
    approved_at: "2026-10-27",
    created_by_name: "Aileen",
    created_at: "2026-10-27T03:00:00Z",
    aspect_count: 3,
    level_count: 6,
    ...overrides,
  };
}

describe("toVersionRow (AC7: daftar versi read-only)", () => {
  // Positive: nomor, tanggal, pembuat, dan penyetuju seperti yang diminta subtask.
  it("shows number, effective date, creator and approver of an active version", () => {
    // Arrange
    const source = version();

    // Act
    const row = toVersionRow(source);

    // Assert
    expect(row).toEqual({
      id: "v-1",
      title: "Versi 1",
      effectiveDate: "27 Okt 2026",
      createdBy: "Aileen",
      approverName: "Steven & Deanne",
      approvedAt: "27 Okt 2026",
      approver: "Steven & Deanne · 27 Okt 2026",
      statusLabel: "Aktif",
      isActive: true,
    });
  });

  it("labels an inactive version as Tidak aktif", () => {
    // Arrange
    const source = version({ is_active: false });

    // Act
    const row = toVersionRow(source);

    // Assert
    expect(row.statusLabel).toBe("Tidak aktif");
    expect(row.isActive).toBe(false);
  });

  // Edge: penyetuju versi baru masih TBA dari klien, jadi kolomnya boleh kosong.
  it("shows a dash when the version has no approver", () => {
    // Arrange
    const source = version({ approved_by_name: null, approved_at: null });

    // Act
    const row = toVersionRow(source);

    // Assert
    expect(row.approver).toBe("-");
    expect(row.approverName).toBe("-");
    expect(row.approvedAt).toBe("-");
  });

  it("shows the approver name alone when the approval date is missing", () => {
    // Arrange
    const source = version({ approved_at: null });

    // Act
    const row = toVersionRow(source);

    // Assert
    expect(row.approver).toBe("Steven & Deanne");
    expect(row.approverName).toBe("Steven & Deanne");
    expect(row.approvedAt).toBe("-");
  });

  // Edge: a date without a name identifies nobody, so it is not shown by itself.
  // A2: the date gets its own column now, but it still is not shown without a name.
  it("shows a dash when only the approval date is present", () => {
    // Arrange
    const source = version({ approved_by_name: null });

    // Act
    const row = toVersionRow(source);

    // Assert
    expect(row.approver).toBe("-");
    expect(row.approverName).toBe("-");
    expect(row.approvedAt).toBe("-");
  });

  // Edge: the creator account can be gone, the server sends null.
  it("shows a dash when the creator is unknown", () => {
    // Arrange
    const source = version({ created_by_name: null });

    // Act
    const row = toVersionRow(source);

    // Assert
    expect(row.createdBy).toBe("-");
  });

  // Negative: a blank name is not an approver either.
  it("treats a blank approver name as no approver", () => {
    // Arrange
    const source = version({ approved_by_name: "   " });

    // Act
    const row = toVersionRow(source);

    // Assert
    expect(row.approver).toBe("-");
    expect(row.approvedAt).toBe("-");
  });
});

describe("versionRangeText (A1: footer jumlah baris)", () => {
  // Positive: the whole list fits on one page.
  it("names the shown range, the total and the order", () => {
    // Act
    const text = versionRangeText({ from: 1, to: 8, total: 8 });

    // Assert
    expect(text).toBe("Menampilkan 1–8 dari 8 versi · terbaru di atas");
  });

  // Positive: the second page of a longer list.
  it("names the range of a later page", () => {
    // Act
    const text = versionRangeText({ from: 11, to: 12, total: 12 });

    // Assert
    expect(text).toBe("Menampilkan 11–12 dari 12 versi · terbaru di atas");
  });

  // Edge: one version gives "1–1"; edge because from equals to, and a "1 dari 1" shortcut would read differently on the phone cards.
  it("keeps the range form for a single version", () => {
    // Act
    const text = versionRangeText({ from: 1, to: 1, total: 1 });

    // Assert
    expect(text).toBe("Menampilkan 1–1 dari 1 versi · terbaru di atas");
  });
});

describe("nextVersionNo (B: judul Akan disimpan sebagai Versi N)", () => {
  // Positive: the server numbers a new version max + 1 (grading/service.py), so the page says the same.
  it("is one above the highest number, whatever the order", () => {
    // Act
    const next = nextVersionNo([version({ version_no: 3 }), version({ version_no: 8 }), version({ version_no: 5 })]);

    // Assert
    expect(next).toBe(9);
  });

  // Edge: no version yet; edge because max() of nothing is undefined, and the server then starts at 1.
  it("is 1 when there is no version yet", () => {
    // Act
    const next = nextVersionNo([]);

    // Assert
    expect(next).toBe(1);
  });
});

describe("sortNewestFirst", () => {
  it("orders versions by number, highest first", () => {
    // Arrange
    const versions = [version({ id: "a", version_no: 1 }), version({ id: "c", version_no: 3 }), version({ id: "b", version_no: 2 })];

    // Act
    const sorted = sortNewestFirst(versions);

    // Assert
    expect(sorted.map((v) => v.id)).toEqual(["c", "b", "a"]);
  });

  // Edge: the caller's array is not reordered behind its back.
  it("does not change the array it was given", () => {
    // Arrange
    const versions = [version({ id: "a", version_no: 1 }), version({ id: "b", version_no: 2 })];

    // Act
    sortNewestFirst(versions);

    // Assert
    expect(versions.map((v) => v.id)).toEqual(["a", "b"]);
  });

  it("returns an empty list for no versions", () => {
    // Arrange
    const versions: RubricVersionSummary[] = [];

    // Act
    const sorted = sortNewestFirst(versions);

    // Assert
    expect(sorted).toEqual([]);
  });
});

describe("latestVersion (AC7: nilai ulang dengan versi terbaru)", () => {
  // Positive: terbaru berarti nomor versi tertinggi, bukan urutan dari server atau yang aktif.
  it("picks the highest version number whatever the order", () => {
    // Arrange
    const versions = [version({ id: "b", version_no: 2 }), version({ id: "c", version_no: 3, is_active: false }), version({ id: "a", version_no: 1 })];

    // Act
    const latest = latestVersion(versions);

    // Assert
    expect(latest?.id).toBe("c");
  });

  // Negative / edge: before v1 exists there is nothing to re-grade with.
  it("returns null when there are no versions", () => {
    // Arrange
    const versions: RubricVersionSummary[] = [];

    // Act
    const latest = latestVersion(versions);

    // Assert
    expect(latest).toBeNull();
  });

  it("returns the only version when there is one", () => {
    // Arrange
    const versions = [version({ id: "only" })];

    // Act
    const latest = latestVersion(versions);

    // Assert
    expect(latest?.id).toBe("only");
  });
});
