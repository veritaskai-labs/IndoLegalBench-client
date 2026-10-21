import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { makeReviewCopy, structuredRef } from "@/test/reviewFixtures";
import { ReviewCaseContent } from "./ReviewCaseContent";

/** The row of one section: its label and the lines next to it. */
const section = (label: string) => screen.getByText(label).parentElement as HTMLElement;

describe("ReviewCaseContent", () => {
  // Positive
  it("shows the case code, the version and the question as the heading", () => {
    // Arrange
    const copy = makeReviewCopy({ case_code: "ILB-PT-0142", version_no: 3 });

    // Act
    render(<ReviewCaseContent copy={copy} />);

    // Assert
    expect(screen.getByText("ILB-PT-0142")).toBeInTheDocument();
    expect(screen.getByText("Versi 3")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Apakah pemberitahuan tertulis kepada pekerja wajib sebelum PHK?",
      }),
    ).toBeInTheDocument();
  });

  // Positive
  it("shows the title and the category", () => {
    // Arrange
    const copy = makeReviewCopy();

    // Act
    render(<ReviewCaseContent copy={copy} />);

    // Assert
    expect(within(section("Judul")).getByText("Kewajiban pemberitahuan tertulis sebelum PHK")).toBeInTheDocument();
    expect(within(section("Kategori")).getByText("Ketenagakerjaan")).toBeInTheDocument();
  });

  // Positive: the dev/test tag is information here, not something to pick (PBI-9 AC2).
  it.each([
    ["dev", "Tag Dev set, hanya informasi dan tidak dinilai"],
    ["test", "Tag Test set, hanya informasi dan tidak dinilai"],
  ] as const)("shows the %s tag as an info-only badge in the header", (tag, label) => {
    // Arrange
    const copy = makeReviewCopy({ split_tag: tag });

    // Act
    render(<ReviewCaseContent copy={copy} />);

    // Assert
    const header = screen.getByRole("banner");
    expect(within(header).getByLabelText(label)).toBeInTheDocument();
    expect(within(header).getByText("info saja")).toBeInTheDocument();
  });

  // Edge: the tag has one place on the page, so it is not repeated in the list of sections.
  it("does not repeat the tag in the list of sections", () => {
    // Arrange
    const copy = makeReviewCopy({ split_tag: "test" });

    // Act
    render(<ReviewCaseContent copy={copy} />);

    // Assert
    expect(screen.queryByText("Tag dev/test")).not.toBeInTheDocument();
    expect(screen.getAllByLabelText(/^Tag (Dev|Test) set/)).toHaveLength(1);
  });

  // Positive: the shared formatter writes the legal reference the way the case editor reads it.
  it("writes each legal reference as one line", () => {
    // Arrange
    const copy = makeReviewCopy({
      legal_refs: [
        structuredRef("UU No. 13 Tahun 2003, Pasal 151 ayat (3)"),
        structuredRef("UU No. 6 Tahun 2023, Pasal 81"),
      ],
    });

    // Act
    render(<ReviewCaseContent copy={copy} />);

    // Assert
    const refs = section("Rujukan hukum");
    expect(within(refs).getByText("UU No. 13 Tahun 2003, Pasal 151 ayat (3)")).toBeInTheDocument();
    expect(within(refs).getByText("UU No. 6 Tahun 2023, Pasal 81")).toBeInTheDocument();
  });

  // Edge: two references can read the same, and both stay on the page without a duplicate key warning.
  it("shows two identical legal reference lines once each without a key warning", () => {
    // Arrange
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const copy = makeReviewCopy({
      legal_refs: [structuredRef("UU No. 13 Tahun 2003, Pasal 151"), structuredRef("UU No. 13 Tahun 2003, Pasal 151")],
    });

    // Act
    render(<ReviewCaseContent copy={copy} />);

    // Assert
    expect(within(section("Rujukan hukum")).getAllByText("UU No. 13 Tahun 2003, Pasal 151")).toHaveLength(2);
    expect(errors).not.toHaveBeenCalled();
    errors.mockRestore();
  });

  // Positive
  it("shows the answer criteria and numbers the traps with the expected model behaviour", () => {
    // Arrange
    const copy = makeReviewCopy({
      answer_criteria: {
        must_contain: ["harus_menyebut"],
        must_not_contain: ["dilarang_menyitasi"],
        expected_conclusion: "Wajib tertulis",
      },
      traps: [
        { description: "Menyitasi peraturan yang dicabut", expected_model_behavior: "Menolak menyitasi" },
        { description: "Mengabaikan caveat" },
      ],
    });

    // Act
    render(<ReviewCaseContent copy={copy} />);

    // Assert
    const criteria = section("Kriteria jawaban");
    expect(within(criteria).getByText("Wajib ada: harus_menyebut")).toBeInTheDocument();
    expect(within(criteria).getByText("Tidak boleh ada: dilarang_menyitasi")).toBeInTheDocument();
    expect(within(criteria).getByText("Kesimpulan: Wajib tertulis")).toBeInTheDocument();
    const traps = section("Pengurang Poin");
    expect(
      within(traps).getByText("1. Menyitasi peraturan yang dicabut (perilaku yang diharapkan: Menolak menyitasi)"),
    ).toBeInTheDocument();
    expect(within(traps).getByText("2. Mengabaikan caveat")).toBeInTheDocument();
  });

  // Edge: a part with nothing in it shows a dash instead of an empty gap.
  it("shows a dash for a part that has no content", () => {
    // Arrange
    const copy = makeReviewCopy({
      legal_refs: [],
      traps: [],
      identity: { title: "Judul", question: "Tanya?", category: null },
    });

    // Act
    render(<ReviewCaseContent copy={copy} />);

    // Assert
    expect(within(section("Rujukan hukum")).getByText("—")).toBeInTheDocument();
    expect(within(section("Pengurang Poin")).getByText("—")).toBeInTheDocument();
    expect(within(section("Kategori")).getByText("—")).toBeInTheDocument();
  });

  // Negative: the reviewer reads the case here, the editor is elsewhere.
  it("has nothing to type into or press", () => {
    // Arrange
    const copy = makeReviewCopy();

    // Act
    render(<ReviewCaseContent copy={copy} />);

    // Assert
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
  });
});
