import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { emptyCaseFormValues, type CaseFormValues } from "@/lib/cases/caseFormMapping";
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
};

/** Form kecil seperti editor: menyimpan nilai dan memberi tahu nilainya saat tombol ditekan. */
function Host({
  refs,
  regulationTypes = READY,
  errors = {},
  invalidRows = [],
  onValues,
}: HostProps) {
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

  it("shows every link of a chain with its connector and its own form, without a button to add links", async () => {
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
    expect(screen.getByText("jo.")).toBeInTheDocument();
    expect(screen.getAllByLabelText("Pasal")).toHaveLength(2);
    expect(
      within(formSelect("Bentuk peraturan 2")).queryByRole("option", { name: "Teks Bebas" }),
    ).not.toBeInTheDocument();
    expect(ref?.links.map((item) => [item.form, item.angka])).toEqual([
      ["pasal", ""],
      ["pasal", ""],
    ]);
    expect(
      screen.queryByRole("button", { name: /rangkai|tambah peraturan/i }),
    ).not.toBeInTheDocument();
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
          "legal_refs.0.links.0.pasal": "Field legal_refs[0].links[0].pasal wajib diisi",
          "legal_refs.0.links.0.regulation_type": "Jenis peraturan wajib dipilih.",
        }}
      />,
    );

    // Assert
    expect(screen.getByLabelText("Pasal")).toHaveAccessibleDescription(
      "Field legal_refs[0].links[0].pasal wajib diisi",
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
