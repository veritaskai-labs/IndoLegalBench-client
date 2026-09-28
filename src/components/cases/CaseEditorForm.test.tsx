import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CaseFormValues, CaseWritePayload } from "@/lib/cases/caseFormMapping";
import type { FieldSaveError } from "@/lib/cases/saveError";
import { CaseEditorForm } from "./CaseEditorForm";

const filled: CaseFormValues = {
  case_code: "ILB-PT-0142",
  identity: {
    title: "Pemberitahuan PHK",
    question: "Apakah pemberitahuan tertulis wajib?",
    category: "Ketenagakerjaan",
  },
  legal_refs: [
    {
      regulation_type: "UU",
      regulation_number: "13",
      year: "2003",
      pasal: "151",
      ayat: "3",
      huruf: "",
    },
  ],
  answer_criteria: {
    must_contain: "Pasal 151",
    must_not_contain: "",
    expected_conclusion: "Wajib.",
  },
  traps: [{ description: "Sitasi PP yang dicabut", expected_model_behavior: "" }],
  split_tag: "test",
};

function refRow(n: number) {
  return screen.getByRole("group", { name: `Rujukan ${n}` });
}

function trapRow(n: number) {
  return screen.getByRole("group", { name: `Jebakan ${n}` });
}

describe("CaseEditorForm", () => {
  // Positive: AC1, all five sections are shown.
  it("shows the five sections of the case editor", () => {
    render(<CaseEditorForm onSubmit={vi.fn()} />);

    for (const name of [
      "Identitas",
      "Rujukan hukum",
      "Kriteria jawaban",
      "Jebakan",
      "Tag dev/test",
    ]) {
      expect(screen.getByRole("group", { name })).toBeInTheDocument();
    }
  });

  it("starts blank with one legal reference row, no traps, and no tag chosen", () => {
    render(<CaseEditorForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("ID kasus")).toHaveValue("");
    expect(within(refRow(1)).getByLabelText("Pasal")).toHaveValue("");
    expect(screen.queryByRole("group", { name: "Rujukan 2" })).not.toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Jebakan 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /dev/ })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: /test/ })).not.toBeChecked();
  });

  it("explains each split tag briefly", () => {
    render(<CaseEditorForm onSubmit={vi.fn()} />);

    const tags = screen.getByRole("group", { name: "Tag dev/test" });
    expect(within(tags).getByText(/pengembangan/i)).toBeInTheDocument();
    expect(within(tags).getByText(/pengujian akhir/i)).toBeInTheDocument();
  });

  it("prefills every section from defaultValues when editing", () => {
    render(<CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("ID kasus")).toHaveValue("ILB-PT-0142");
    expect(screen.getByLabelText("Judul")).toHaveValue("Pemberitahuan PHK");
    expect(screen.getByLabelText("Kategori")).toHaveValue("Ketenagakerjaan");
    expect(screen.getByLabelText("Pertanyaan")).toHaveValue(
      "Apakah pemberitahuan tertulis wajib?",
    );
    expect(within(refRow(1)).getByLabelText("Tahun")).toHaveValue(2003);
    expect(screen.getByLabelText("Wajib ada")).toHaveValue("Pasal 151");
    expect(screen.getByLabelText("Kesimpulan yang diharapkan")).toHaveValue("Wajib.");
    expect(within(trapRow(1)).getByLabelText("Deskripsi")).toHaveValue(
      "Sitasi PP yang dicabut",
    );
    expect(screen.getByRole("radio", { name: /test/ })).toBeChecked();
  });

  it("submits the mapped payload after the author fills the form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CaseEditorForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText("ID kasus"), "ILB-1");
    await user.type(screen.getByLabelText("Judul"), "Judul");
    await user.type(screen.getByLabelText("Pertanyaan"), "Tanya?");
    const ref = within(refRow(1));
    await user.type(ref.getByLabelText("Jenis peraturan"), "UU");
    await user.type(ref.getByLabelText("Nomor"), "13");
    await user.type(ref.getByLabelText("Tahun"), "2003");
    await user.type(ref.getByLabelText("Pasal"), "151");
    await user.type(screen.getByLabelText("Wajib ada"), "a{enter}b");
    await user.click(screen.getByRole("button", { name: "+ Tambah jebakan" }));
    await user.type(within(trapRow(1)).getByLabelText("Deskripsi"), "Jebak");
    await user.click(screen.getByRole("radio", { name: /dev/ }));
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith({
      case_code: "ILB-1",
      identity: { title: "Judul", question: "Tanya?", category: null },
      legal_refs: [
        {
          regulation_type: "UU",
          regulation_number: "13",
          year: 2003,
          pasal: "151",
          ayat: null,
          huruf: null,
        },
      ],
      answer_criteria: {
        must_contain: ["a", "b"],
        must_not_contain: [],
        expected_conclusion: null,
      },
      traps: [{ description: "Jebak", expected_model_behavior: null }],
      split_tag: "dev",
    });
  });

  // Negative: the form never blocks; the server decides (CONTRIBUTING §6).
  it("still submits an empty form so the server can answer with its errors", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CaseEditorForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      case_code: "",
      split_tag: null,
    });
  });

  // Corner cases: dynamic rows.
  it("adds legal reference rows", async () => {
    const user = userEvent.setup();
    render(<CaseEditorForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "+ Tambah rujukan" }));
    await user.click(screen.getByRole("button", { name: "+ Tambah rujukan" }));

    expect(refRow(3)).toBeInTheDocument();
  });

  it("removes the middle legal reference row and keeps the others' values", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(payload: CaseWritePayload) => void>();
    render(<CaseEditorForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "+ Tambah rujukan" }));
    await user.click(screen.getByRole("button", { name: "+ Tambah rujukan" }));
    await user.type(within(refRow(1)).getByLabelText("Pasal"), "1");
    await user.type(within(refRow(2)).getByLabelText("Pasal"), "2");
    await user.type(within(refRow(3)).getByLabelText("Pasal"), "3");

    await user.click(screen.getByRole("button", { name: "Hapus rujukan 2" }));

    expect(within(refRow(1)).getByLabelText("Pasal")).toHaveValue("1");
    expect(within(refRow(2)).getByLabelText("Pasal")).toHaveValue("3");
    expect(screen.queryByRole("group", { name: "Rujukan 3" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Simpan draf" }));
    const pasal = onSubmit.mock.calls[0]?.[0].legal_refs.map((ref) => ref.pasal);
    expect(pasal).toEqual(["1", "3"]);
  });

  it("lets the author remove the last legal reference row; the server reports it", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CaseEditorForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Hapus rujukan 1" }));
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(screen.queryByRole("group", { name: "Rujukan 1" })).not.toBeInTheDocument();
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({ legal_refs: [] });
  });

  it("adds and removes trap rows", async () => {
    const user = userEvent.setup();
    render(<CaseEditorForm onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "+ Tambah jebakan" }));
    await user.click(screen.getByRole("button", { name: "+ Tambah jebakan" }));
    await user.type(within(trapRow(2)).getByLabelText("Deskripsi"), "Kedua");
    await user.click(screen.getByRole("button", { name: "Hapus jebakan 1" }));

    expect(within(trapRow(1)).getByLabelText("Deskripsi")).toHaveValue("Kedua");
    expect(screen.queryByRole("group", { name: "Jebakan 2" })).not.toBeInTheDocument();
  });

  // Corner case: repeated submit.
  it("disables the save button while a save is running, so a double click sends once", async () => {
    const user = userEvent.setup();
    let finish: () => void = () => undefined;
    const onSubmit = vi.fn(
      () => new Promise<void>((resolve) => {
        finish = resolve;
      }),
    );
    render(<CaseEditorForm onSubmit={onSubmit} />);

    const save = screen.getByRole("button", { name: "Simpan draf" });
    await user.click(save);
    await user.click(save);

    expect(save).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledTimes(1);

    finish();
    await vi.waitFor(() => expect(save).toBeEnabled());
  });
});

describe("CaseEditorForm server errors", () => {
  // onSubmit resolves with the field error the page mapped from the server
  // (mapSaveError). The form only places it; it never decides validity.
  function rejectingWith(error: FieldSaveError) {
    return vi.fn<(payload: CaseWritePayload) => Promise<FieldSaveError>>(() =>
      Promise.resolve(error),
    );
  }

  async function submitWith(error: FieldSaveError, defaultValues?: CaseFormValues) {
    const user = userEvent.setup();
    render(
      <CaseEditorForm defaultValues={defaultValues} onSubmit={rejectingWith(error)} />,
    );
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));
    return user;
  }

  // Positive: AC3
  it("shows a duplicate case code under ID kasus and marks it invalid", async () => {
    await submitWith({
      kind: "field",
      path: "case_code",
      message: "Kode kasus 'ILB-1' sudah dipakai di suite 'Perburuhan'",
      detail: null,
    });

    const input = screen.getByLabelText("ID kasus");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription(
      "Kode kasus 'ILB-1' sudah dipakai di suite 'Perburuhan'",
    );
  });

  it("moves focus to the field the server rejected", async () => {
    await submitWith({
      kind: "field",
      path: "identity.question",
      message: "Field identity.question wajib diisi",
      detail: null,
    });

    expect(screen.getByLabelText("Pertanyaan")).toHaveFocus();
  });

  // Positive: AC5, the error lands on the exact row only.
  it("shows a missing pasal on the second legal reference row only", async () => {
    const twoRefs: CaseFormValues = {
      ...filled,
      legal_refs: [filled.legal_refs[0], { ...filled.legal_refs[0], pasal: "" }],
    };
    await submitWith(
      {
        kind: "field",
        path: "legal_refs.1.pasal",
        message: "Field legal_refs[1].pasal wajib diisi",
        detail: null,
      },
      twoRefs,
    );

    const second = within(refRow(2)).getByLabelText("Pasal");
    expect(second).toHaveAttribute("aria-invalid", "true");
    expect(second).toHaveAccessibleDescription("Field legal_refs[1].pasal wajib diisi");
    expect(within(refRow(1)).getByLabelText("Pasal")).not.toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });

  it("shows a trap row error on that row", async () => {
    await submitWith(
      {
        kind: "field",
        path: "traps.0.description",
        message: "Field traps[0].description wajib diisi",
        detail: null,
      },
      filled,
    );

    expect(within(trapRow(1)).getByLabelText("Deskripsi")).toHaveAccessibleDescription(
      "Field traps[0].description wajib diisi",
    );
  });

  it("adds the server detail after the Indonesian message", async () => {
    await submitWith(
      {
        kind: "field",
        path: "legal_refs.0.year",
        message: "Isian tidak valid.",
        detail: "Input should be greater than or equal to 1",
      },
      filled,
    );

    expect(within(refRow(1)).getByLabelText("Tahun")).toHaveAccessibleDescription(
      "Isian tidak valid. (Input should be greater than or equal to 1)",
    );
  });

  // Corner: errors that belong to a whole section, not one input.
  it("shows a whole-list legal reference error in the Rujukan hukum section", async () => {
    await submitWith({
      kind: "field",
      path: "legal_refs",
      message: "Minimal satu rujukan hukum sampai level pasal",
      detail: null,
    });

    const section = screen.getByRole("group", { name: "Rujukan hukum" });
    expect(within(section).getByText("Minimal satu rujukan hukum sampai level pasal")).toBeInTheDocument();
  });

  it("shows a split tag error in the Tag dev/test section and marks both radios invalid", async () => {
    await submitWith({
      kind: "field",
      path: "split_tag",
      message: "Tag dev/test wajib diisi",
      detail: null,
    });

    const section = screen.getByRole("group", { name: "Tag dev/test" });
    expect(within(section).getByText("Tag dev/test wajib diisi")).toBeInTheDocument();
    for (const radio of within(section).getAllByRole("radio")) {
      expect(radio).toHaveAttribute("aria-invalid", "true");
    }
  });

  it("shows a phrase list error under its textarea", async () => {
    await submitWith({
      kind: "field",
      path: "answer_criteria.must_contain",
      message: "Isian tidak valid.",
      detail: null,
    });

    expect(screen.getByLabelText("Wajib ada")).toHaveAccessibleDescription("Isian tidak valid.");
  });

  // Corner: repeated submit clears the old server error.
  it("clears the old server error when the next save succeeds", async () => {
    const user = userEvent.setup();
    const onSubmit = vi
      .fn<(payload: CaseWritePayload) => Promise<FieldSaveError | null>>()
      .mockResolvedValueOnce({
        kind: "field",
        path: "case_code",
        message: "Kode kasus sudah dipakai",
        detail: null,
      })
      .mockResolvedValueOnce(null);
    render(<CaseEditorForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Simpan draf" }));
    expect(screen.getByText("Kode kasus sudah dipakai")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(screen.queryByText("Kode kasus sudah dipakai")).not.toBeInTheDocument();
    expect(screen.getByLabelText("ID kasus")).not.toHaveAttribute("aria-invalid", "true");
  });

  // Negative: nothing is marked invalid before the server says so.
  it("marks no field invalid before any save", () => {
    render(<CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} />);

    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
  });
});
