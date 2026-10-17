import { describe, expect, it } from "vitest";
import { makeReviewCopy, structuredRef } from "@/test/reviewFixtures";
import { reviewCopyToSections } from "./reviewCaseSections";

describe("reviewCopyToSections", () => {
  // Positive: every part of the case lands under the key the shared section views read.
  it("maps the case fields to the section keys", () => {
    // Arrange
    const copy = makeReviewCopy({
      case_code: "ILB-PT-0142",
      split_tag: "test",
      identity: { title: "Judul kasus", question: "Apakah wajib?", category: "Ketenagakerjaan" },
    });

    // Act
    const sections = reviewCopyToSections(copy);

    // Assert
    expect(sections).toMatchObject({
      "identity.title": "Judul kasus",
      "identity.question": "Apakah wajib?",
      category: "Ketenagakerjaan",
      case_code: "ILB-PT-0142",
      split_tag: "test",
    });
  });

  // Positive: the structured parts are passed on as they are, the shared formatter reads them.
  it("passes the legal references, answer criteria and traps on unchanged", () => {
    // Arrange
    const legalRefs = [structuredRef("UU No. 13 Tahun 2003, Pasal 151")];
    const criteria = { must_contain: ["harus_menyebut"], must_not_contain: [], expected_conclusion: null };
    const traps = [{ description: "Menyitasi aturan yang sudah dicabut" }];
    const copy = makeReviewCopy({ legal_refs: legalRefs, answer_criteria: criteria, traps });

    // Act
    const sections = reviewCopyToSections(copy);

    // Assert
    expect(sections.legal_refs).toBe(legalRefs);
    expect(sections.answer_criteria).toBe(criteria);
    expect(sections.traps).toBe(traps);
  });

  // Edge: the category is optional on a case.
  it("keeps a missing category as null", () => {
    // Arrange
    const copy = makeReviewCopy({
      identity: { title: "Judul", question: "Tanya?", category: null },
    });

    // Act
    const sections = reviewCopyToSections(copy);

    // Assert
    expect(sections.category).toBeNull();
  });
});
