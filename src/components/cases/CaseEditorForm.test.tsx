import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CaseFormValues, CaseWritePayload } from "@/lib/cases/caseFormMapping";
import type { FieldSaveError } from "@/lib/cases/saveError";
import { CASE_HELP } from "@/lib/cases/caseHelpText";
import { CaseEditorForm, VALIDATE_DELAY_MS } from "./CaseEditorForm";

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

  // Negative: SCRUM-109 checks the contract rules (gen:zod) before sending,
  // so an empty form never reaches the server. The button stays enabled (AC2).
  it("does not send an empty form and lists what is missing above the form", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CaseEditorForm onSubmit={onSubmit} />);

    const save = screen.getByRole("button", { name: "Simpan draf" });
    await user.click(save);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(save).toBeEnabled();
    const summary = screen.getByRole("alert");
    expect(summary).toHaveTextContent("Periksa 7 isian berikut sebelum menyimpan:");
    for (const message of [
      "ID kasus wajib diisi.",
      "Judul wajib diisi.",
      "Pertanyaan wajib diisi.",
      "Jenis peraturan wajib diisi.",
      "Nomor peraturan wajib diisi.",
      "Pasal wajib diisi.",
      "Pilih tag dev atau test.",
    ]) {
      expect(within(summary).getByRole("button", { name: message })).toBeInTheDocument();
    }
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
    // Mulai dari tiga baris: yang diuji penghapusan baris tengah, bukan mengetik.
    // Mengetik huruf demi huruf di sini dulu membuat test ini timeout saat suite penuh berjalan.
    const ref = filled.legal_refs[0];
    const legal_refs = ["1", "2", "3"].map((pasal) => ({ ...ref, pasal }));
    render(<CaseEditorForm defaultValues={{ ...filled, legal_refs }} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Hapus rujukan 2" }));

    expect(within(refRow(1)).getByLabelText("Pasal")).toHaveValue("1");
    expect(within(refRow(2)).getByLabelText("Pasal")).toHaveValue("3");
    expect(screen.queryByRole("group", { name: "Rujukan 3" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Simpan draf" }));
    const pasal = onSubmit.mock.calls[0]?.[0].legal_refs.map((ref) => ref.pasal);
    expect(pasal).toEqual(["1", "3"]);
  });

  it("lets the author remove the last legal reference row, then says one is needed", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CaseEditorForm defaultValues={filled} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Hapus rujukan 1" }));
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(screen.queryByRole("group", { name: "Rujukan 1" })).not.toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    const section = screen.getByRole("group", { name: "Rujukan hukum" });
    expect(
      within(section).getByText("Butuh minimal satu rujukan hukum sampai tingkat pasal."),
    ).toBeInTheDocument();
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
    render(<CaseEditorForm defaultValues={filled} onSubmit={onSubmit} />);

    const save = screen.getByRole("button", { name: "Simpan draf" });
    await user.click(save);
    await user.click(save);

    expect(save).toBeDisabled();
    expect(onSubmit).toHaveBeenCalledTimes(1);

    finish();
    await vi.waitFor(() => expect(save).toBeEnabled());
  });
});

describe("CaseEditorForm unsaved changes", () => {
  // Positive
  it("reports unsaved changes after the author edits a field", async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    render(
      <CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} onDirtyChange={onDirtyChange} />,
    );

    await user.type(screen.getByLabelText("Judul"), " baru");

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });

  // Negative
  it("reports no unsaved changes before the author edits anything", () => {
    const onDirtyChange = vi.fn();
    render(
      <CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} onDirtyChange={onDirtyChange} />,
    );

    expect(onDirtyChange).not.toHaveBeenCalledWith(true);
  });

  // Corner cases
  it("reports clean again when the author types the original value back", async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    render(
      <CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} onDirtyChange={onDirtyChange} />,
    );
    const code = screen.getByLabelText("ID kasus");

    await user.type(code, "X");
    await user.type(code, "{backspace}");

    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });

  it("counts adding a row as an unsaved change", async () => {
    const user = userEvent.setup();
    const onDirtyChange = vi.fn();
    render(
      <CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} onDirtyChange={onDirtyChange} />,
    );

    await user.click(screen.getByRole("button", { name: "+ Tambah jebakan" }));

    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
  });
});

describe("CaseEditorForm server errors", () => {
  // onSubmit resolves with the field error the page mapped from the server
  // (mapSaveError). The form starts valid, so the browser checks pass and
  // only the server's answer decides what is shown.
  function rejectingWith(error: FieldSaveError) {
    return vi.fn<(payload: CaseWritePayload) => Promise<FieldSaveError>>(() =>
      Promise.resolve(error),
    );
  }

  async function submitWith(error: FieldSaveError, defaultValues?: CaseFormValues) {
    const user = userEvent.setup();
    render(
      <CaseEditorForm defaultValues={defaultValues ?? filled} onSubmit={rejectingWith(error)} />,
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
      legal_refs: [filled.legal_refs[0], { ...filled.legal_refs[0], pasal: "152" }],
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

  // ARIA puts aria-invalid on the radiogroup, not on each radio.
  it("shows a split tag error in the Tag dev/test section and marks the radio group invalid", async () => {
    await submitWith({
      kind: "field",
      path: "split_tag",
      message: "Tag dev/test wajib diisi",
      detail: null,
    });

    const radios = screen.getByRole("radiogroup", { name: "Tag dev/test" });
    expect(radios).toHaveAttribute("aria-invalid", "true");
    expect(radios).toHaveAccessibleDescription("Tag dev/test wajib diisi");
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
    render(<CaseEditorForm defaultValues={filled} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Simpan draf" }));
    expect(screen.getByLabelText("ID kasus")).toHaveAccessibleDescription("Kode kasus sudah dipakai");

    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(screen.queryByText("Kode kasus sudah dipakai")).not.toBeInTheDocument();
    expect(screen.getByLabelText("ID kasus")).not.toHaveAttribute("aria-invalid", "true");
  });

  // Negative: nothing is marked invalid before the author saves or leaves a field.
  it("marks no field invalid before any save", () => {
    render(<CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} />);

    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
  });
});

describe("CaseEditorForm inline validation (SCRUM-109)", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  // Positive: AC2, a draft saves without traps and answer criteria.
  it("saves a draft that has no traps and no answer criteria yet", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const draft: CaseFormValues = {
      ...filled,
      answer_criteria: { must_contain: "", must_not_contain: "", expected_conclusion: "" },
      traps: [],
    };
    render(<CaseEditorForm defaultValues={draft} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("checks a field when the author leaves it, and only that field", async () => {
    const user = userEvent.setup();
    render(<CaseEditorForm onSubmit={vi.fn()} />);

    await user.click(screen.getByLabelText("Judul"));
    await user.tab();

    await vi.waitFor(() =>
      expect(screen.getByLabelText("Judul")).toHaveAccessibleDescription("Judul wajib diisi."),
    );
    expect(screen.getByLabelText("Judul")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("ID kasus")).not.toHaveAttribute("aria-invalid", "true");
  });

  it("checks while typing, but only after a short pause", async () => {
    // fireEvent instead of userEvent: userEvent waits on timers of its own,
    // which fake timers would freeze.
    vi.useFakeTimers();
    render(<CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} />);
    const code = screen.getByLabelText("ID kasus");

    fireEvent.change(code, { target: { value: "-PHK" } });
    await act(async () => {
      vi.advanceTimersByTime(VALIDATE_DELAY_MS - 1);
    });
    expect(code).not.toHaveAttribute("aria-invalid", "true");

    await act(async () => {
      vi.advanceTimersByTime(1);
    });
    expect(code).toHaveAttribute("aria-invalid", "true");
    expect(code).toHaveAccessibleDescription(/^ID kasus diawali huruf atau angka/);

    // Fixing it clears the error after the same pause.
    fireEvent.change(code, { target: { value: "PHK-1" } });
    await act(async () => {
      vi.advanceTimersByTime(VALIDATE_DELAY_MS);
    });
    expect(code).not.toHaveAttribute("aria-invalid", "true");
  });

  it("restarts the pause on every keystroke", async () => {
    vi.useFakeTimers();
    render(<CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} />);
    const code = screen.getByLabelText("ID kasus");

    fireEvent.change(code, { target: { value: "-" } });
    await act(async () => {
      vi.advanceTimersByTime(VALIDATE_DELAY_MS - 50);
    });
    fireEvent.change(code, { target: { value: "-P" } });
    await act(async () => {
      vi.advanceTimersByTime(VALIDATE_DELAY_MS - 50);
    });
    expect(code).not.toHaveAttribute("aria-invalid", "true");

    await act(async () => {
      vi.advanceTimersByTime(50);
    });
    expect(code).toHaveAttribute("aria-invalid", "true");
  });

  // Corner: simpan sebelum jeda validasi selesai. Validasi yang tertunda tidak boleh
  // menghapus error dari server (penyebab test "clears the banner…" di halaman kasus baru flaky).
  it("keeps the server error when the field changed just before saving", async () => {
    vi.useFakeTimers();
    const duplicate: FieldSaveError = {
      kind: "field",
      path: "case_code",
      message: "Kode kasus 'PHK-2' sudah dipakai di suite 'Perburuhan'",
      detail: null,
    };
    render(<CaseEditorForm defaultValues={filled} onSubmit={vi.fn(() => Promise.resolve(duplicate))} />);
    const code = screen.getByLabelText("ID kasus");

    fireEvent.change(code, { target: { value: "PHK-2" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Simpan draf" }));
    });
    expect(code).toHaveAccessibleDescription(duplicate.message);

    await act(async () => {
      vi.advanceTimersByTime(VALIDATE_DELAY_MS);
    });
    expect(code).toHaveAttribute("aria-invalid", "true");
    expect(code).toHaveAccessibleDescription(duplicate.message);
  });

  // Guard: perubahan sesudah simpan tetap divalidasi ulang setelah jeda, seperti biasa.
  it("still re-checks a field the author changes after the server rejected it", async () => {
    vi.useFakeTimers();
    const duplicate: FieldSaveError = {
      kind: "field",
      path: "case_code",
      message: "Kode kasus 'PHK-2' sudah dipakai di suite 'Perburuhan'",
      detail: null,
    };
    render(<CaseEditorForm defaultValues={filled} onSubmit={vi.fn(() => Promise.resolve(duplicate))} />);
    const code = screen.getByLabelText("ID kasus");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Simpan draf" }));
    });
    expect(code).toHaveAccessibleDescription(duplicate.message);

    fireEvent.change(code, { target: { value: "PHK-3" } });
    await act(async () => {
      vi.advanceTimersByTime(VALIDATE_DELAY_MS);
    });
    expect(code).not.toHaveAttribute("aria-invalid", "true");
  });

  // Negative: an empty row the author just added is not an error yet.
  it("does not flag a new empty trap row before the author touches it", async () => {
    const user = userEvent.setup();
    render(<CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "+ Tambah jebakan" }));
    await new Promise((resolve) => setTimeout(resolve, VALIDATE_DELAY_MS + 50));

    expect(trapRow(2)).not.toHaveAttribute("aria-invalid", "true");
    expect(document.querySelectorAll('[aria-invalid="true"]')).toHaveLength(0);
  });

  it("highlights only the legal reference row that needs fixing", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const twoRefs: CaseFormValues = {
      ...filled,
      legal_refs: [filled.legal_refs[0], { ...filled.legal_refs[0], pasal: "" }],
    };
    render(<CaseEditorForm defaultValues={twoRefs} onSubmit={onSubmit} />);

    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(refRow(2)).toHaveAttribute("aria-invalid", "true");
    expect(within(refRow(2)).getByText("Baris ini perlu diperbaiki.")).toBeInTheDocument();
    expect(refRow(1)).not.toHaveAttribute("aria-invalid", "true");
  });

  it("moves focus to the field picked from the summary", async () => {
    const user = userEvent.setup();
    render(<CaseEditorForm defaultValues={{ ...filled, identity: { ...filled.identity, question: "" } }} onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Simpan draf" }));
    await user.click(screen.getByLabelText("Judul"));
    await user.click(within(screen.getByRole("alert")).getByRole("button", { name: "Pertanyaan wajib diisi." }));

    expect(screen.getByLabelText("Pertanyaan")).toHaveFocus();
  });

  it("removes a fixed field from the summary", async () => {
    const user = userEvent.setup();
    render(<CaseEditorForm defaultValues={{ ...filled, identity: { ...filled.identity, title: "" } }} onSubmit={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Simpan draf" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Judul wajib diisi.");

    await user.type(screen.getByLabelText("Judul"), "Pemberitahuan PHK");
    await user.tab();

    await vi.waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  // UAT TC_29: the summary does not wait for Simpan.
  it("shows the summary as soon as a field fails, before saving", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<CaseEditorForm onSubmit={onSubmit} />);

    await user.click(screen.getByLabelText("Judul"));
    await user.tab();

    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Periksa 1 isian berikut sebelum menyimpan:");
    expect(within(summary).getByRole("button", { name: "Judul wajib diisi." })).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Simpan draf" })).toBeEnabled();
  });

  // UAT TC_35: what the traps and the dev/test tag mean.
  it("explains that traps test the precision of the answer and dev/test is a dataset split", () => {
    render(<CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} />);

    expect(screen.getByRole("group", { name: "Jebakan" })).toHaveTextContent(/menguji ketelitian model/);
    expect(screen.getByRole("group", { name: "Tag dev/test" })).toHaveTextContent(
      /metodologi dataset .* bukan tingkat kesulitan/,
    );
  });

  // SCRUM-131, AC4 (revisi) dan AC6, masukan UAT #11 dan #12.
  it("says traps are optional and a case without traps can still be submitted for review", () => {
    render(<CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} />);

    const traps = screen.getByRole("group", { name: "Jebakan" });
    expect(traps).toHaveTextContent(/^Jebakan\s*Opsional\./);
    expect(traps).toHaveTextContent(/tetap bisa diajukan review tanpa jebakan/);
  });

  it("explains a trap with a real example: an answer that looks right but cites a revoked article", () => {
    render(<CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} />);

    const traps = screen.getByRole("group", { name: "Jebakan" });
    // Review Rafa di PR #23: jebakan adalah skenario yang memancing jawaban keliru, bukan jawabannya sendiri.
    expect(traps).toHaveTextContent(/Jebakan adalah skenario yang memancing jawaban/);
    expect(traps).toHaveTextContent(/tampak benar tapi sebenarnya keliru/);
    expect(traps).toHaveTextContent(/pasal yang sudah dicabut/);
  });

  // Negative: aturan lama (minimal satu jebakan) tidak boleh muncul lagi.
  it("no longer tells the Author that at least one trap is required", () => {
    render(<CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} />);

    expect(screen.getByRole("group", { name: "Jebakan" })).not.toHaveTextContent(/minimal satu/i);
  });

  // Corner: kasus baru belum punya baris jebakan, bantuan tetap terlihat.
  it("shows the trap help on a new case that has no trap rows yet", () => {
    render(<CaseEditorForm onSubmit={vi.fn()} />);

    const traps = screen.getByRole("group", { name: "Jebakan" });
    expect(within(traps).queryByRole("group")).not.toBeInTheDocument();
    expect(traps).toHaveTextContent(/Opsional\..*tetap bisa diajukan review tanpa jebakan/);
  });

  it("gives every legal reference and answer criteria field its own hint", () => {
    render(<CaseEditorForm defaultValues={filled} onSubmit={vi.fn()} />);

    for (const label of ["Jenis peraturan", "Nomor", "Tahun", "Pasal", "Ayat (opsional)", "Huruf (opsional)"]) {
      expect(within(refRow(1)).getByLabelText(label)).toHaveAccessibleDescription(/.+/);
    }
    for (const label of ["Wajib ada", "Tidak boleh ada", "Kesimpulan yang diharapkan"]) {
      expect(screen.getByLabelText(label)).toHaveAccessibleDescription(/.+/);
    }
  });

  // AC6: help text on the fields.
  it("describes a field with its help text while it has no error", () => {
    render(<CaseEditorForm onSubmit={vi.fn()} />);

    expect(screen.getByLabelText("ID kasus")).toHaveAccessibleDescription(CASE_HELP.caseCode);
    expect(screen.getByRole("group", { name: "Jebakan" })).toHaveTextContent(CASE_HELP.traps);
  });
});

describe("CaseEditorForm placeholders and optional labels (SCRUM-131)", () => {
  // Positive: masukan UAT #4, contoh isian dari tiket.
  it("shows an example in every legal reference field", () => {
    render(<CaseEditorForm onSubmit={vi.fn()} />);

    const ref = within(refRow(1));
    expect(ref.getByLabelText("Jenis peraturan")).toHaveAttribute("placeholder", "UU");
    expect(ref.getByLabelText("Nomor")).toHaveAttribute("placeholder", "13");
    expect(ref.getByLabelText("Tahun")).toHaveAttribute("placeholder", "2003");
    expect(ref.getByLabelText("Pasal")).toHaveAttribute("placeholder", "156");
    expect(ref.getByLabelText("Ayat (opsional)")).toHaveAttribute("placeholder", "2");
    expect(ref.getByLabelText("Huruf (opsional)")).toHaveAttribute("placeholder", "a");
  });

  it("gives every input in the editor a non-empty placeholder, trap rows included", async () => {
    const user = userEvent.setup();
    render(<CaseEditorForm onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "+ Tambah jebakan" }));

    const inputs = [...screen.getAllByRole("textbox"), ...screen.getAllByRole("spinbutton")];
    expect(inputs).toHaveLength(15);
    for (const input of inputs) {
      expect(input.getAttribute("placeholder") ?? "", input.id).not.toBe("");
    }
  });

  // Positive: masukan UAT #10, ayat dan huruf opsional.
  it("labels ayat and huruf as optional without repeating it in their hints", () => {
    render(<CaseEditorForm onSubmit={vi.fn()} />);

    const ref = within(refRow(1));
    for (const label of ["Ayat (opsional)", "Huruf (opsional)"]) {
      expect(ref.getByLabelText(label)).toHaveAccessibleDescription(/.+/);
      expect(ref.getByLabelText(label)).not.toHaveAccessibleDescription(/opsional/i);
    }
  });

  // Negative: kolom wajib tidak ikut diberi label opsional.
  it("does not mark the required reference fields as optional", () => {
    render(<CaseEditorForm onSubmit={vi.fn()} />);

    const ref = within(refRow(1));
    for (const label of ["Jenis peraturan", "Nomor", "Pasal"]) {
      expect(ref.getByLabelText(label)).toBeInTheDocument();
      expect(ref.queryByLabelText(new RegExp(`^${label}.*opsional`, "i"))).not.toBeInTheDocument();
    }
  });

  // Corner: baris rujukan yang baru ditambah juga punya contoh.
  it("shows the examples on a newly added reference row", async () => {
    const user = userEvent.setup();
    render(<CaseEditorForm onSubmit={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "+ Tambah rujukan" }));

    expect(within(refRow(2)).getByLabelText("Pasal")).toHaveAttribute("placeholder", "156");
    expect(within(refRow(2)).getByLabelText("Huruf (opsional)")).toHaveAttribute("placeholder", "a");
  });

  // Corner: placeholder hanya contoh, tidak ikut terkirim sebagai isi.
  it("does not send a placeholder as a value when an optional field is left empty", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(payload: CaseWritePayload) => void>();
    render(<CaseEditorForm defaultValues={{ ...filled, identity: { ...filled.identity, category: "" } }} onSubmit={onSubmit} />);

    expect(within(refRow(1)).getByLabelText("Huruf (opsional)")).toHaveValue("");
    await user.click(screen.getByRole("button", { name: "Simpan draf" }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0]?.[0];
    expect(payload?.legal_refs[0]?.huruf).toBeNull();
    expect(payload?.identity.category).toBeNull();
  });
});
