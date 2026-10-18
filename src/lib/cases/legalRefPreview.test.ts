import { describe, expect, it } from "vitest";
import { emptyLegalRef, emptyLink, type LegalRefFormValues } from "./legalRefForm";
import type { LegalRefPreviewItem } from "./legalRefPreviewApi";
import {
  alignPreviews,
  buildPreviewRequest,
  previewFieldErrors,
  type PreviewResult,
} from "./legalRefPreview";

// Contoh hukum hanya KTK-001 dan contoh AC10 (dari Aileen, belum dikonfirmasi tim legal).
// Teks bebas dan nilai "1" adalah input format sintetis.

/** KTK-001 (Sprint 1): Pasal 156 UU 13/2003. */
function ktk001(): LegalRefFormValues {
  return {
    kind: "structured",
    free_text: "",
    links: [{ ...emptyLink("pasal"), regulation_type: "uu", number: "13", year: "2003", pasal: "156" }],
  };
}

const TEXT_KTK_001 = "Pasal 156 UU 13/2003";

function freeText(): LegalRefFormValues {
  return { kind: "free_text", free_text: "Format teks bebas", links: [] };
}

function ok(text: string): LegalRefPreviewItem {
  return { display_text: text, error: null };
}

function failed(code: string, message: string, field: string): LegalRefPreviewItem {
  return { display_text: null, error: { code, message, field } };
}

/** Hasil server untuk persis rujukan-rujukan ini. */
function resultFor(refs: LegalRefFormValues[], items: LegalRefPreviewItem[]): PreviewResult {
  return { sent: buildPreviewRequest(refs).sent, items };
}

describe("buildPreviewRequest", () => {
  it("sends the same payload as a save, one entry per citation", () => {
    // Act
    const { payload, sent } = buildPreviewRequest([ktk001(), freeText()]);

    // Assert
    expect(payload).toEqual([
      {
        kind: "structured",
        free_text: null,
        links: [
          {
            form: "pasal",
            connector: "none",
            regulation_type: "uu",
            number: "13",
            year: 2003,
            about: "",
            pasal: "156",
            angka: null,
            ayat: "",
            huruf: "",
          },
        ],
      },
      { kind: "free_text", free_text: "Format teks bebas", links: [] },
    ]);
    expect(sent).toEqual(payload.map((item) => JSON.stringify(item)));
  });

  it("builds nothing for no citations", () => {
    expect(buildPreviewRequest([])).toEqual({ payload: [], sent: [] });
  });
});

describe("alignPreviews", () => {
  // Positif
  it("shows the server text under an unchanged citation", () => {
    // Arrange
    const refs = [ktk001()];

    // Act
    const previews = alignPreviews(refs, resultFor(refs, [ok(TEXT_KTK_001)]));

    // Assert
    expect(previews).toEqual([{ text: TEXT_KTK_001, error: null }]);
  });

  it("maps a server error onto the form field, with the server's sentence", () => {
    // Arrange
    const refs = [ktk001()];
    const item = failed(
      "FIELD_REQUIRED",
      "Nomor peraturan wajib diisi.",
      "legal_refs[0].links[0].number",
    );

    // Act
    const [preview] = alignPreviews(refs, resultFor(refs, [item]));

    // Assert
    expect(preview).toEqual({
      text: null,
      error: {
        kind: "field",
        path: "legal_refs.0.links.0.number",
        message: "Nomor peraturan wajib diisi.",
        detail: null,
      },
    });
  });

  it("keeps the save wording for a schema error: Indonesian text first, server detail after", () => {
    // Arrange
    const refs = [ktk001()];
    const item = failed("VALIDATION_ERROR", "String should match pattern", "legal_refs[0].links[0].pasal");

    // Act
    const [preview] = alignPreviews(refs, resultFor(refs, [item]));

    // Assert
    expect(preview?.error).toEqual({
      kind: "field",
      path: "legal_refs.0.links.0.pasal",
      message: "Isian tidak valid.",
      detail: "String should match pattern",
    });
  });

  it("keeps an error without a form field at the citation level", () => {
    // Arrange
    const refs = [ktk001()];
    const item = failed("FIELD_REQUIRED", "Peraturan ke-2 wajib diisi.", "legal_refs[0].links[1]");

    // Act
    const [preview] = alignPreviews(refs, resultFor(refs, [item]));

    // Assert
    expect(preview?.error).toEqual({ kind: "form", message: "Peraturan ke-2 wajib diisi." });
  });

  it("hides the text of a Teks Bebas citation (PO decision 9)", () => {
    // Arrange
    const refs = [freeText()];

    // Act
    const previews = alignPreviews(refs, resultFor(refs, [ok("Format teks bebas")]));

    // Assert
    expect(previews).toEqual([{ text: null, error: null }]);
  });

  // Negatif: hasil lama tidak boleh menempel ke isi baru
  it("shows nothing before the first answer", () => {
    expect(alignPreviews([ktk001(), freeText()], null)).toEqual([null, null]);
  });

  it("drops the preview of a citation that changed after the request was sent", () => {
    // Arrange
    const sent = [ktk001()];
    const typed = ktk001();
    typed.links[0] = { ...typed.links[0], pasal: "1" } as LegalRefFormValues["links"][number];

    // Act
    const previews = alignPreviews([typed], resultFor(sent, [ok(TEXT_KTK_001)]));

    // Assert
    expect(previews).toEqual([null]);
  });

  // Edge
  it("does not shift an old preview onto the next citation when a middle one is removed", () => {
    // Arrange
    const first = ktk001();
    const middle = freeText();
    const last = emptyLegalRef();
    const result = resultFor([first, middle, last], [ok(TEXT_KTK_001), ok("x"), ok("y")]);

    // Act
    const previews = alignPreviews([first, last], result);

    // Assert
    expect(previews).toEqual([{ text: TEXT_KTK_001, error: null }, null]);
  });

  it("shows nothing for a citation added after the request", () => {
    // Arrange
    const sent = [ktk001()];

    // Act
    const previews = alignPreviews([ktk001(), emptyLegalRef()], resultFor(sent, [ok(TEXT_KTK_001)]));

    // Assert
    expect(previews).toEqual([{ text: TEXT_KTK_001, error: null }, null]);
  });
});

describe("previewFieldErrors", () => {
  it("collects field errors by form path, formatted like a save error", () => {
    // Arrange
    const refs = [ktk001(), ktk001()];
    const previews = alignPreviews(
      refs,
      resultFor(refs, [
        failed("FIELD_REQUIRED", "Pasal wajib diisi untuk bentuk Pasal.", "legal_refs[0].links[0].pasal"),
        failed("VALIDATION_ERROR", "too long", "legal_refs[1].links[0].number"),
      ]),
    );

    // Act
    const errors = previewFieldErrors(previews);

    // Assert
    expect([...errors]).toEqual([
      ["legal_refs.0.links.0.pasal", "Pasal wajib diisi untuk bentuk Pasal."],
      ["legal_refs.1.links.0.number", "Isian tidak valid. (too long)"],
    ]);
  });

  it("skips citations without a preview, without an error, or with a citation-level error", () => {
    // Arrange
    const refs = [ktk001(), ktk001(), ktk001()];
    const previews = alignPreviews(
      [...refs, emptyLegalRef()],
      resultFor(refs, [
        ok(TEXT_KTK_001),
        failed("FIELD_REQUIRED", "Peraturan ke-2 wajib diisi.", "legal_refs[1].links[1]"),
        ok(TEXT_KTK_001),
      ]),
    );

    // Act
    const errors = previewFieldErrors(previews);

    // Assert
    expect(errors.size).toBe(0);
  });
});
