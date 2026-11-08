import { describe, expect, it } from "vitest";
import {
  EVIDENCE_LIMIT_MESSAGE,
  MAX_EVIDENCE_PER_ANSWER,
  canAddEvidence,
  formatFileSize,
  safeEvidenceHref,
  validateEvidence,
} from "./manualEvidenceRules";

function file(name: string, type: string, content = "isi"): File {
  return new File([content], name, { type });
}

describe("canAddEvidence (AC7, at most 3 per answer)", () => {
  // Positive: below the limit.
  it.each([0, 1, 2])("allows another item when the answer has %i", (count) => {
    // Arrange
    // (count comes from the table)

    // Act
    const allowed = canAddEvidence(count);

    // Assert
    expect(allowed).toBe(true);
  });

  // Negative: at the limit, and even above it if the server ever returns more.
  it.each([3, 4])("refuses another item when the answer has %i", (count) => {
    // Arrange
    // (count comes from the table)

    // Act
    const allowed = canAddEvidence(count);

    // Assert
    expect(allowed).toBe(false);
  });

  // Edge: null means this role may not see evidence at all, so nothing can be added from here.
  it("refuses when the count is hidden for this role", () => {
    // Arrange
    const count = null;

    // Act
    const allowed = canAddEvidence(count);

    // Assert
    expect(allowed).toBe(false);
  });

  it("keeps the limit at 3", () => {
    // Arrange / Act / Assert
    expect(MAX_EVIDENCE_PER_ANSWER).toBe(3);
  });
});

describe("validateEvidence for a file (AC7: PNG, JPG, PDF)", () => {
  // Positive: the three allowed types.
  it.each([
    ["bukti.png", "image/png"],
    ["bukti.jpg", "image/jpeg"],
    ["bukti.pdf", "application/pdf"],
  ])("accepts %s", (name, type) => {
    // Arrange
    const input = { kind: "file", file: file(name, type) } as const;

    // Act
    const error = validateEvidence(input, 0);

    // Assert
    expect(error).toBeNull();
  });

  // Negative: other types are refused with a message that names the allowed ones.
  it.each([
    ["animasi.gif", "image/gif"],
    ["dokumen.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ])("rejects %s", (name, type) => {
    // Arrange
    const input = { kind: "file", file: file(name, type) } as const;

    // Act
    const error = validateEvidence(input, 0);

    // Assert
    expect(error).toBe("Hanya berkas PNG, JPG, atau PDF yang boleh diunggah.");
  });

  // Edge: some OS and picker combinations report no type for a real PNG; the server checks the
  // content (magic bytes), so the client lets an empty type or octet-stream through.
  it.each([
    ["layar.png", ""],
    ["layar.jpg", "application/octet-stream"],
  ])("lets %s with the generic type %j through to the server", (name, type) => {
    // Arrange
    const input = { kind: "file", file: file(name, type) } as const;

    // Act
    const error = validateEvidence(input, 0);

    // Assert
    expect(error).toBeNull();
  });

  // Negative: a generic type does not skip the empty-file check.
  it("still rejects an empty file with no type", () => {
    // Arrange
    const input = { kind: "file", file: file("kosong.png", "", "") } as const;

    // Act
    const error = validateEvidence(input, 0);

    // Assert
    expect(error).toBe("Berkas kosong. Pilih tangkapan layar yang benar.");
  });

  // Edge: an empty file has nothing to show.
  it("rejects an empty file", () => {
    // Arrange
    const input = { kind: "file", file: file("kosong.png", "image/png", "") } as const;

    // Act
    const error = validateEvidence(input, 0);

    // Assert
    expect(error).toBe("Berkas kosong. Pilih tangkapan layar yang benar.");
  });

  // Edge: no client size limit; the technical limit belongs to the server (413).
  it("accepts a large file and leaves the size limit to the server", () => {
    // Arrange
    const input = { kind: "file", file: file("besar.pdf", "application/pdf", "x".repeat(5_000_000)) } as const;

    // Act
    const error = validateEvidence(input, 0);

    // Assert
    expect(error).toBeNull();
  });
});

describe("validateEvidence for a link (AC7)", () => {
  // Positive: http and https links.
  it.each(["https://justisio.com/chat/123", "http://contoh.id/a?b=1#c", "  https://contoh.id  "])(
    "accepts %j",
    (url) => {
      // Arrange
      const input = { kind: "link", url } as const;

      // Act
      const error = validateEvidence(input, 1);

      // Assert
      expect(error).toBeNull();
    },
  );

  // Negative: empty input.
  it.each(["", "   "])("rejects the empty link %j", (url) => {
    // Arrange
    const input = { kind: "link", url } as const;

    // Act
    const error = validateEvidence(input, 0);

    // Assert
    expect(error).toBe("Tautan bukti wajib diisi.");
  });

  // Negative: not a URL, and unsafe schemes that must never be stored as a clickable link.
  it.each(["justisio.com/chat", "bukan tautan", "javascript:alert(1)", "data:text/html,x", "ftp://contoh.id/f"])(
    "rejects %j",
    (url) => {
      // Arrange
      const input = { kind: "link", url } as const;

      // Act
      const error = validateEvidence(input, 0);

      // Assert
      expect(error).toBe("Tautan bukti harus diawali http:// atau https://.");
    },
  );
});

describe("validateEvidence limit", () => {
  // Negative: the limit wins over an otherwise valid item, for both kinds.
  it.each([
    { kind: "link", url: "https://contoh.id" } as const,
    { kind: "file", file: file("a.png", "image/png") } as const,
  ])("refuses a valid $kind when the answer already has 3", (input) => {
    // Arrange
    const count = 3;

    // Act
    const error = validateEvidence(input, count);

    // Assert
    expect(error).toBe(EVIDENCE_LIMIT_MESSAGE);
  });

  // Edge: the third item is still allowed.
  it("accepts the third item", () => {
    // Arrange
    const input = { kind: "link", url: "https://contoh.id" } as const;

    // Act
    const error = validateEvidence(input, 2);

    // Assert
    expect(error).toBeNull();
  });
});

describe("safeEvidenceHref (a stored link becomes clickable only when it is http or https)", () => {
  // Positive.
  it.each(["https://justisio.com/chat/1", "http://contoh.id/a?b=1"])("keeps %s", (url) => {
    // Arrange
    // (url comes from the table)

    // Act
    const href = safeEvidenceHref(url);

    // Assert
    expect(href).toBe(url);
  });

  // Negative: defence in depth, the server already refuses these.
  it.each(["javascript:alert(1)", "data:text/html,x", "ftp://contoh.id", "bukan tautan", "", null])(
    "returns null for %j",
    (url) => {
      // Arrange
      // (url comes from the table)

      // Act
      const href = safeEvidenceHref(url);

      // Assert
      expect(href).toBeNull();
    },
  );
});

describe("formatFileSize", () => {
  // Positive: sizes in readable units, Indonesian decimal comma.
  it.each([
    [0, "0 B"],
    [512, "512 B"],
    [1024, "1 KB"],
    [1536, "1,5 KB"],
    [1048576, "1 MB"],
    [10 * 1048576, "10 MB"],
  ])("shows %i bytes as %s", (bytes, expected) => {
    // Arrange
    // (bytes come from the table)

    // Act
    const text = formatFileSize(bytes);

    // Assert
    expect(text).toBe(expected);
  });

  // Edge: a link has no size, and a bad value is not shown as NaN.
  it.each([null, -5, Number.NaN])("returns an empty string for %j", (bytes) => {
    // Arrange
    // (bytes come from the table)

    // Act
    const text = formatFileSize(bytes);

    // Assert
    expect(text).toBe("");
  });
});
