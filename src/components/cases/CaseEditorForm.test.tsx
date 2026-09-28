import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CaseFormValues, CaseWritePayload } from "@/lib/cases/caseFormMapping";
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
