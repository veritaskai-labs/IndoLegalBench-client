import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { emptyCaseFormValues, type CaseFormValues } from "@/lib/cases/caseFormMapping";
import type { CitationPreview, PreviewState } from "@/lib/cases/legalRefPreview";
import type { CaseFieldPath } from "@/lib/cases/saveError";
import {
  emptyLegalRef,
  emptyLink,
  type LegalRefFormValues,
  type LegalRefLinkFormValues,
} from "@/lib/cases/legalRefForm";
import type { RegulationType } from "@/types/regulationType";
import { LegalRefsSection } from "./LegalRefsSection";

const TYPES: RegulationType[] = [
  { code: "uu", label: "Undang-undang", singkatan: "UU", is_active: true },
  { code: "pp", label: "Peraturan Pemerintah", singkatan: "PP", is_active: true },
  {
    code: "peraturan_menteri_keuangan",
    label: "Peraturan Menteri Keuangan",
    singkatan: null,
    is_active: true,
  },
];

type TypesState =
  | { status: "ready"; types: RegulationType[]; reload: () => void }
  | { status: "loading"; reload: () => void }
  | { status: "error"; message: string; reload: () => void };

const READY: TypesState = { status: "ready", types: TYPES, reload: vi.fn() };

type HostProps = {
  refs?: LegalRefFormValues[];
  regulationTypes?: TypesState;
  errors?: Partial<Record<CaseFieldPath, string>>;
  invalidRows?: string[];
  onValues?: (refs: LegalRefFormValues[]) => void;
  preview?: PreviewState;
};

/** Form kecil seperti editor: menyimpan nilai dan memberi tahu nilainya saat tombol ditekan. */
function Host({
  refs,
  regulationTypes = READY,
  errors = {},
  invalidRows = [],
  onValues,
  preview,
}: Readonly<HostProps>) {
  const { register, control, getValues } = useForm<CaseFormValues>({
    defaultValues: { ...emptyCaseFormValues(), legal_refs: refs ?? [emptyLegalRef()] },
  });
  return (
    <>
      <LegalRefsSection
        register={register}
        control={control}
        regulationTypes={regulationTypes}
        errorFor={(path) => errors[path]}
        rowHasError={(row) => invalidRows.includes(row)}
        preview={preview}
      />
      <button type="button" onClick={() => onValues?.(getValues().legal_refs)}>
        Ambil nilai
      </button>
    </>
  );
}

function link(overrides: Partial<LegalRefLinkFormValues> = {}): LegalRefLinkFormValues {
  return { ...emptyLink("pasal"), regulation_type: "uu", number: "13", year: "2003", ...overrides };
}

function structured(...links: LegalRefLinkFormValues[]): LegalRefFormValues {
  return { kind: "structured", free_text: "", links };
}

async function readValues(user: ReturnType<typeof userEvent.setup>, spy: ReturnType<typeof vi.fn>) {
  await user.click(screen.getByRole("button", { name: "Ambil nilai" }));
  return spy.mock.calls.at(-1)?.[0] as LegalRefFormValues[];
}

const formSelect = (name = "Bentuk rujukan") => screen.getByRole("combobox", { name });

describe("LegalRefsSection", () => {
  // AC1, AC4: one reference with fields that follow its form
  it("starts with one structured reference in the pasal form", () => {
    // Arrange + Act
    render(<Host />);

    // Assert
    expect(screen.getByRole("group", { name: "Rujukan 1" })).toBeInTheDocument();
    expect(formSelect()).toHaveValue("pasal");
    for (const label of [
      "Jenis peraturan",
      "Nomor",
      "Tahun",
      "Tentang (opsional)",
      "Pasal",
      "Ayat (opsional)",
      "Huruf (opsional)",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.queryByLabelText("Angka")).not.toBeInTheDocument();
  });

  it("offers the four forms of AC4, free text last", () => {
    // Arrange + Act
    render(<Host />);

    // Assert
    const labels = within(formSelect())
      .getAllByRole("option")
      .map((option) => option.textContent);
    expect(labels).toEqual(["Nama Peraturan saja", "Pasal", "Pasal + Angka", "Teks Bebas"]);
  });

  it("shows Angka right after Pasal for the pasal and angka form", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Host />);

    // Act
    await user.selectOptions(formSelect(), "pasal_angka");

    // Assert
    const angka = screen.getByLabelText("Angka");
    const pasal = screen.getByLabelText("Pasal");
    expect(pasal.compareDocumentPosition(angka) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("hides pasal, angka, ayat and huruf for the name-only form but keeps the regulation fields", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Host />);

    // Act
    await user.selectOptions(formSelect(), "name_only");

    // Assert
    for (const label of ["Pasal", "Angka", "Ayat (opsional)", "Huruf (opsional)"]) {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
    }
    for (const label of ["Jenis peraturan", "Nomor", "Tahun", "Tentang (opsional)"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("clears the fields the new form does not use but keeps the regulation", async () => {
    // Arrange
    const user = userEvent.setup();
    const onValues = vi.fn();
    render(<Host refs={[structured(link({ pasal: "156", ayat: "1" }))]} onValues={onValues} />);

    // Act
    await user.selectOptions(formSelect(), "name_only");
    const [ref] = await readValues(user, onValues);

    // Assert
    expect(ref?.links[0]).toMatchObject({
      form: "name_only",
      pasal: "",
      ayat: "",
      number: "13",
      year: "2003",
      regulation_type: "uu",
    });
  });

  // AC7: free text
  it("turns the reference into free text with a label that marks it unstructured", async () => {
    // Arrange
    const user = userEvent.setup();
    const onValues = vi.fn();
    render(<Host onValues={onValues} />);

    // Act
    await user.selectOptions(formSelect(), "free_text");
    const [ref] = await readValues(user, onValues);

    // Assert
    expect(screen.getByLabelText("Teks bebas")).toBeInTheDocument();
    expect(screen.getByText("Tidak terstruktur")).toBeInTheDocument();
    expect(screen.queryByLabelText("Nomor")).not.toBeInTheDocument();
    expect(ref).toMatchObject({ kind: "free_text", links: [] });
  });

  it("keeps what the Author types as free text", async () => {
    // Arrange
    const user = userEvent.setup();
    const onValues = vi.fn();
    render(<Host onValues={onValues} />);
    await user.selectOptions(formSelect(), "free_text");

    // Act
    await user.type(screen.getByLabelText("Teks bebas"), "Putusan MA 12 K/Pdt/2020");
    const [ref] = await readValues(user, onValues);

    // Assert
    expect(ref?.free_text).toBe("Putusan MA 12 K/Pdt/2020");
  });

  it("starts one empty link of the chosen form when free text becomes structured again", async () => {
    // Arrange
    const user = userEvent.setup();
    const onValues = vi.fn();
    render(
      <Host
        refs={[{ kind: "free_text", free_text: "Putusan MA", links: [] }]}
        onValues={onValues}
      />,
    );

    // Act
    await user.selectOptions(formSelect(), "pasal_angka");
    const [ref] = await readValues(user, onValues);

    // Assert
    expect(ref).toMatchObject({ kind: "structured", free_text: "" });
    expect(ref?.links).toEqual([emptyLink("pasal_angka")]);
    expect(screen.queryByLabelText("Teks bebas")).not.toBeInTheDocument();
  });

  // AC9: old references
  it("opens a reference that was kept as free text with its text and the unstructured label", () => {
    // Arrange + Act
    render(
      <Host
        refs={[{ kind: "free_text", free_text: "Peraturan Kuno Nomor 5 Tahun 2001", links: [] }]}
      />,
    );

    // Assert
    expect(screen.getByLabelText("Teks bebas")).toHaveValue("Peraturan Kuno Nomor 5 Tahun 2001");
    expect(screen.getByText("Tidak terstruktur")).toBeInTheDocument();
  });

  it("opens a Sprint 1 reference without a year with an empty year to fill in", () => {
    // Arrange + Act
    render(<Host refs={[structured(link({ year: "", pasal: "156" }))]} />);

    // Assert
    expect(screen.getByLabelText("Tahun")).toHaveValue(null);
    expect(screen.getByLabelText("Pasal")).toHaveValue("156");
    expect(screen.getByLabelText("Nomor")).toHaveValue("13");
  });

  it("shows every link of a chain with its connector and its own form", async () => {
    // Arrange
    const user = userEvent.setup();
    const onValues = vi.fn();
    const chain = structured(
      link({ pasal: "156" }),
      link({
        form: "pasal_angka",
        connector: "jo",
        number: "6",
        year: "2023",
        pasal: "II",
        angka: "5",
      }),
    );
    render(<Host refs={[chain]} onValues={onValues} />);

    // Act
    await user.selectOptions(formSelect("Bentuk peraturan 2"), "pasal");
    const [ref] = await readValues(user, onValues);

    // Assert
    expect(formSelect("Penghubung peraturan 2")).toHaveValue("jo");
    expect(screen.getAllByLabelText("Pasal")).toHaveLength(2);
    expect(
      within(formSelect("Bentuk peraturan 2")).queryByRole("option", { name: "Teks Bebas" }),
    ).not.toBeInTheDocument();
    expect(ref?.links.map((item) => [item.form, item.angka])).toEqual([
      ["pasal", ""],
      ["pasal", ""],
    ]);
  });

  // AC1: several references
  it("adds a second reference with the default form", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Host />);

    // Act
    await user.click(screen.getByRole("button", { name: "+ Tambah rujukan" }));

    // Assert
    const second = screen.getByRole("group", { name: "Rujukan 2" });
    expect(within(second).getByRole("combobox", { name: "Bentuk rujukan" })).toHaveValue("pasal");
  });

  it("removes a reference and renumbers the rest", async () => {
    // Arrange
    const user = userEvent.setup();
    const onValues = vi.fn();
    render(
      <Host
        refs={[structured(link({ pasal: "1" })), structured(link({ pasal: "2" }))]}
        onValues={onValues}
      />,
    );

    // Act
    await user.click(screen.getByRole("button", { name: "Hapus rujukan 1" }));
    const refs = await readValues(user, onValues);

    // Assert
    expect(screen.queryByRole("group", { name: "Rujukan 2" })).not.toBeInTheDocument();
    expect(refs).toHaveLength(1);
    expect(refs[0]?.links[0]?.pasal).toBe("2");
  });

  // AC2: the regulation type dropdown
  it("chooses the regulation type from the list and keeps its code", async () => {
    // Arrange
    const user = userEvent.setup();
    const onValues = vi.fn();
    render(<Host refs={[emptyLegalRef()]} onValues={onValues} />);

    // Act
    await user.click(screen.getByRole("combobox", { name: "Jenis peraturan" }));
    await user.click(screen.getByRole("option", { name: /Peraturan Pemerintah/ }));
    const [ref] = await readValues(user, onValues);

    // Assert
    expect(ref?.links[0]?.regulation_type).toBe("pp");
    expect(screen.getByRole("combobox", { name: "Jenis peraturan" })).toHaveValue(
      "Peraturan Pemerintah",
    );
  });

  it("disables the dropdown while the list is loading", () => {
    // Arrange + Act
    render(<Host regulationTypes={{ status: "loading", reload: vi.fn() }} />);

    // Assert
    const dropdown = screen.getByRole("combobox", { name: "Jenis peraturan" });
    expect(dropdown).toBeDisabled();
    expect(dropdown).toHaveAttribute("placeholder", "Memuat jenis peraturan...");
  });

  it("shows why the list failed and lets the Author try again", async () => {
    // Arrange
    const user = userEvent.setup();
    const reload = vi.fn();
    render(
      <Host
        regulationTypes={{
          status: "error",
          message: "Gagal memuat daftar jenis peraturan. Coba lagi.",
          reload,
        }}
      />,
    );

    // Act
    await user.click(screen.getByRole("button", { name: "Coba lagi" }));

    // Assert
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Gagal memuat daftar jenis peraturan. Coba lagi.",
    );
    expect(screen.getByRole("combobox", { name: "Jenis peraturan" })).toBeDisabled();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  // Errors, labels, help
  it("shows a server error next to its field", () => {
    // Arrange + Act
    render(
      <Host
        errors={{
          "legal_refs.0.links.0.pasal": "Pasal wajib diisi untuk bentuk Pasal.",
          "legal_refs.0.links.0.regulation_type": "Jenis peraturan wajib dipilih.",
        }}
      />,
    );

    // Assert
    expect(screen.getByLabelText("Pasal")).toHaveAccessibleDescription(
      "Pasal wajib diisi untuk bentuk Pasal.",
    );
    expect(screen.getByRole("combobox", { name: "Jenis peraturan" })).toHaveAccessibleDescription(
      "Jenis peraturan wajib dipilih.",
    );
  });

  it("shows an error about the whole list and marks the row that has one", () => {
    // Arrange + Act
    render(
      <Host
        errors={{ legal_refs: "Butuh minimal satu rujukan hukum." }}
        invalidRows={["legal_refs.0"]}
      />,
    );

    // Assert
    expect(screen.getByText("Butuh minimal satu rujukan hukum.")).toBeInTheDocument();
    expect(screen.getByText("Baris ini perlu diperbaiki.")).toBeInTheDocument();
  });

  it("marks optional fields in their label only, and required ones not at all", () => {
    // Arrange + Act
    render(<Host />);

    // Assert
    for (const label of ["Jenis peraturan", "Nomor", "Tahun", "Pasal"]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
    expect(screen.queryByLabelText("Nomor (opsional)")).not.toBeInTheDocument();
    expect(screen.queryAllByText(/^Opsional/)).toHaveLength(0);
  });

  it("tells the Author to pick the specific type when there is one", () => {
    // Arrange + Act
    render(<Host />);

    // Assert
    expect(screen.getByRole("combobox", { name: "Jenis peraturan" })).toHaveAccessibleDescription(
      expect.stringContaining("spesifik"),
    );
  });

  it("shows an example in each empty field and takes the year as a number", () => {
    // Arrange + Act
    render(<Host />);

    // Assert
    expect(screen.getByLabelText("Nomor")).toHaveAttribute("placeholder", "13");
    expect(screen.getByLabelText("Tahun")).toHaveAttribute("placeholder", "2003");
    expect(screen.getByLabelText("Tahun")).toHaveAttribute("type", "number");
    expect(screen.getByLabelText("Pasal")).toHaveAttribute("placeholder", "156");
  });
});

describe("LegalRefsSection errors about the structure of a reference", () => {
  it("shows an error about the form of a reference at the form select", () => {
    // Arrange + Act
    render(<Host errors={{ "legal_refs.0.kind": "Bentuk rujukan wajib diisi." }} />);

    // Assert
    expect(screen.getByRole("combobox", { name: "Bentuk rujukan" })).toHaveAccessibleDescription(
      expect.stringContaining("Bentuk rujukan wajib diisi."),
    );
  });

  it("shows an error about a reference that has no links at the form select", () => {
    // Arrange + Act
    render(<Host errors={{ "legal_refs.0.links": "Peraturan wajib diisi." }} />);

    // Assert
    expect(screen.getByRole("combobox", { name: "Bentuk rujukan" })).toHaveAccessibleDescription(
      expect.stringContaining("Peraturan wajib diisi."),
    );
  });
});

// --- SCRUM-162: rangkai peraturan (AC6) ---------------------------------------

const ADD_LINK = "+ Rangkai peraturan";

describe("LegalRefsSection chaining regulations (AC6, SCRUM-162)", () => {
  // Positif
  it("chains a second regulation with jo. and the Pasal form (PO decision 5)", async () => {
    // Arrange
    const user = userEvent.setup();
    const onValues = vi.fn();
    render(<Host refs={[structured(link({ pasal: "156" }))]} onValues={onValues} />);

    // Act
    await user.click(screen.getByRole("button", { name: ADD_LINK }));
    const [ref] = await readValues(user, onValues);

    // Assert
    expect(formSelect("Penghubung peraturan 2")).toHaveValue("jo");
    expect(formSelect("Bentuk peraturan 2")).toHaveValue("pasal");
    expect(ref?.links).toEqual([link({ pasal: "156" }), emptyLink("pasal", "jo")]);
  });

  it("switches a connector to jis. and lets one chain mix jo. and jis.", async () => {
    // Arrange
    const user = userEvent.setup();
    const onValues = vi.fn();
    render(<Host refs={[structured(link({ pasal: "156" }))]} onValues={onValues} />);

    // Act
    await user.click(screen.getByRole("button", { name: ADD_LINK }));
    await user.selectOptions(formSelect("Penghubung peraturan 2"), "jis");
    await user.click(screen.getByRole("button", { name: ADD_LINK }));
    const [ref] = await readValues(user, onValues);

    // Assert
    expect(within(formSelect("Penghubung peraturan 2")).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "jo.",
      "jis.",
    ]);
    expect(ref?.links.map((item) => item.connector)).toEqual(["none", "jis", "jo"]);
  });

  it("removes a middle regulation and keeps what was typed in the others", async () => {
    // Arrange
    const user = userEvent.setup();
    const onValues = vi.fn();
    const chain = structured(
      link({ number: "13" }),
      link({ connector: "jo", number: "6" }),
      link({ connector: "jis", number: "1" }),
    );
    render(<Host refs={[chain]} onValues={onValues} />);

    // Act
    await user.click(screen.getByRole("button", { name: "Hapus peraturan 2" }));
    const [ref] = await readValues(user, onValues);

    // Assert
    expect(ref?.links.map((item) => [item.connector, item.number])).toEqual([
      ["none", "13"],
      ["jis", "1"],
    ]);
    expect(screen.getAllByLabelText("Nomor").map((input) => (input as HTMLInputElement).value)).toEqual([
      "13",
      "1",
    ]);
    expect(formSelect("Penghubung peraturan 2")).toHaveValue("jis");
  });

  // Negatif
  it("never offers to remove the first regulation", () => {
    // Arrange + Act
    render(<Host refs={[structured(link(), link({ connector: "jo" }))]} />);

    // Assert
    expect(screen.queryByRole("button", { name: "Hapus peraturan 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hapus peraturan 2" })).toBeInTheDocument();
  });

  it("offers no chaining for a Teks Bebas citation", () => {
    // Arrange + Act
    render(<Host refs={[{ kind: "free_text", free_text: "Format teks bebas", links: [] }]} />);

    // Assert
    expect(screen.queryByRole("button", { name: ADD_LINK })).not.toBeInTheDocument();
  });

  // Teks Bebas membuang rangkaian: tanya dulu (keputusan PO no. 8)
  it("asks before Teks Bebas drops a chain, and keeps the chain on Batal", async () => {
    // Arrange
    const user = userEvent.setup();
    const onValues = vi.fn();
    render(<Host refs={[structured(link(), link({ connector: "jo" }))]} onValues={onValues} />);

    // Act
    await user.selectOptions(formSelect(), "free_text");
    const confirm = screen.getByRole("alertdialog", { name: "Ganti ke Teks Bebas?" });
    const message = confirm.textContent;
    await user.click(within(confirm).getByRole("button", { name: "Batal" }));
    const [ref] = await readValues(user, onValues);

    // Assert
    expect(message).toContain("2 peraturan");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(ref?.kind).toBe("structured");
    expect(ref?.links).toHaveLength(2);
    expect(formSelect()).toHaveValue("pasal");
  });

  it("drops the chain and switches to Teks Bebas once confirmed", async () => {
    // Arrange
    const user = userEvent.setup();
    const onValues = vi.fn();
    render(<Host refs={[structured(link(), link({ connector: "jo" }))]} onValues={onValues} />);

    // Act
    await user.selectOptions(formSelect(), "free_text");
    await user.click(screen.getByRole("button", { name: "Ganti ke Teks Bebas" }));
    const [ref] = await readValues(user, onValues);

    // Assert
    expect(ref).toEqual({ kind: "free_text", free_text: "", links: [] });
    expect(screen.getByLabelText("Teks bebas")).toBeInTheDocument();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("does not ask when the new form is not Teks Bebas", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Host refs={[structured(link(), link({ connector: "jo" }))]} />);

    // Act
    await user.selectOptions(formSelect(), "name_only");

    // Assert
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(formSelect()).toHaveValue("name_only");
  });
});

// --- SCRUM-162: pratinjau dan error dari server (AC6, AC8, AC10) --------------

const TEXT_KTK_001 = "Pasal 156 UU 13/2003";

function previewState(...previews: (CitationPreview | null)[]): PreviewState {
  return { previews, failed: false };
}

describe("LegalRefsSection live preview (SCRUM-162)", () => {
  // Positif
  it("shows the server text under its citation", () => {
    // Arrange + Act
    render(
      <Host
        refs={[structured(link({ pasal: "156" })), emptyLegalRef()]}
        preview={previewState({ text: TEXT_KTK_001, error: null }, null)}
      />,
    );

    // Assert
    expect(screen.getByRole("status", { name: "Pratinjau rujukan 1" })).toHaveTextContent(
      `Pratinjau: ${TEXT_KTK_001}`,
    );
    expect(screen.getByRole("status", { name: "Pratinjau rujukan 2" })).toBeEmptyDOMElement();
  });

  it("shows a server error at its field while the Author types (AC8)", () => {
    // Arrange + Act
    render(
      <Host
        refs={[structured(link({ number: "" }))]}
        preview={previewState({
          text: null,
          error: {
            kind: "field",
            path: "legal_refs.0.links.0.number",
            message: "Nomor peraturan wajib diisi.",
            detail: null,
          },
        })}
      />,
    );

    // Assert
    expect(screen.getByLabelText("Nomor")).toHaveAccessibleDescription(
      expect.stringContaining("Nomor peraturan wajib diisi."),
    );
  });

  it("shows a server error with no field of its own under the citation", () => {
    // Arrange + Act
    render(
      <Host
        refs={[structured(link(), link({ connector: "jo" }))]}
        preview={previewState({
          text: null,
          error: { kind: "form", message: "Peraturan ke-2 wajib diisi." },
        })}
      />,
    );

    // Assert
    expect(screen.getByRole("status", { name: "Pratinjau rujukan 1" })).toHaveTextContent(
      "Peraturan ke-2 wajib diisi.",
    );
  });

  // Negatif
  it("keeps the form's own error when both have one for the same field", () => {
    // Arrange + Act
    render(
      <Host
        refs={[structured(link({ number: "" }))]}
        errors={{ "legal_refs.0.links.0.number": "Nomor peraturan wajib diisi (form)." }}
        preview={previewState({
          text: null,
          error: {
            kind: "field",
            path: "legal_refs.0.links.0.number",
            message: "Nomor peraturan wajib diisi.",
            detail: null,
          },
        })}
      />,
    );

    // Assert
    expect(screen.getByText("Nomor peraturan wajib diisi (form).")).toBeInTheDocument();
    expect(screen.queryByText("Nomor peraturan wajib diisi.")).not.toBeInTheDocument();
  });

  it("says the preview could not load, without blocking anything", () => {
    // Arrange + Act
    render(<Host preview={{ previews: [null], failed: true }} />);

    // Assert
    expect(
      screen.getByText("Pratinjau rujukan belum bisa dimuat. Rujukan tetap bisa disimpan."),
    ).toBeInTheDocument();
  });

  // Edge
  it("shows no preview area content before the first answer", () => {
    // Arrange + Act
    render(<Host />);

    // Assert
    expect(screen.getByRole("status", { name: "Pratinjau rujukan 1" })).toBeEmptyDOMElement();
    expect(screen.queryByText(/belum bisa dimuat/)).not.toBeInTheDocument();
  });
});
