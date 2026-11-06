import { describe, expect, it } from "vitest";

import type { RubricVersion } from "@/types/rubric";
import { latestVersion, sortNewestFirst, toVersionRow } from "./rubricVersion";

function version(overrides: Partial<RubricVersion> = {}): RubricVersion {
  return {
    id: "v-1",
    version_no: 1,
    effective_date: "2026-10-27",
    is_active: true,
    locked_at: "2026-10-27T03:00:00Z",
    judge_prompt_quality: "Nilai kualitas jawaban.",
    judge_prompt_format: "Nilai format jawaban.",
    approved_by_name: "Steven & Deanne",
    approved_at: "2026-10-27",
    created_by_name: "Aileen",
    created_at: "2026-10-27T03:00:00Z",
    aspects: [],
    levels: [],
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
      approver: "Steven & Deanne, 27 Okt 2026",
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
  });

  it("shows the approver name alone when the approval date is missing", () => {
    // Arrange
    const source = version({ approved_at: null });

    // Act
    const row = toVersionRow(source);

    // Assert
    expect(row.approver).toBe("Steven & Deanne");
  });

  // Edge: a date without a name identifies nobody, so it is not shown by itself.
  it("shows a dash when only the approval date is present", () => {
    // Arrange
    const source = version({ approved_by_name: null });

    // Act
    const row = toVersionRow(source);

    // Assert
    expect(row.approver).toBe("-");
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
    const versions: RubricVersion[] = [];

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
    const versions: RubricVersion[] = [];

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
