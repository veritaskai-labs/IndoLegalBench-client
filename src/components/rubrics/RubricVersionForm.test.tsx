import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { makeFakeGateway, makeRubricVersion } from "@/test/rubricFixtures";
import { RubricVersionForm } from "./RubricVersionForm";

function setup({
  createVersion = vi.fn().mockResolvedValue(makeRubricVersion({ id: "v-2", version_no: 2 })),
  nextVersionNo = 2 as number | null,
} = {}) {
  const gateway = makeFakeGateway({ createVersion });
  const onCreated = vi.fn();
  const onCancel = vi.fn();
  render(<RubricVersionForm gateway={gateway} nextVersionNo={nextVersionNo} onCreated={onCreated} onCancel={onCancel} />);
  return { gateway, onCreated, onCancel, user: userEvent.setup() };
}

const saveButton = () => screen.getByRole("button", { name: "Simpan versi" });
const templateButton = () => screen.getByRole("button", { name: "Isi dari template rubrik v1" });

/** Paste instead of typing key by key: the result is the same and the test stays fast under a loaded CI runner. */
async function fill(user: UserEvent, label: string, text: string) {
  await user.click(screen.getByLabelText(label));
  await user.paste(text);
}

/** The template fills levels and aspect names; the rest of the required fields are filled in here. */
async function fillRequired(user: UserEvent) {
  await user.click(templateButton());
  await fill(user, "Berlaku sejak", "2026-12-01");
  await fill(user, "Prompt penilai kualitas", "Nilai kualitas.");
  await fill(user, "Prompt penilai format", "Nilai format.");
  for (const number of [1, 2, 3]) await fill(user, `Definisi aspek ${number}`, `Definisi ${number}`);
}

/** Simpan versi, then confirm in the summary dialog (B4). */
async function saveAndConfirm(user: UserEvent, confirmName = "Simpan Versi 2") {
  await user.click(saveButton());
  await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: confirmName }));
}

describe("RubricVersionForm (AC7 form, SCRUM-375 B1–B7)", () => {
  // Positive: every field the sub task names is there.
  it("shows the fields for dates, approver, prompts, one aspect and the six levels", () => {
    // Arrange / Act
    setup();

    // Assert
    for (const name of ["Berlaku sejak", "Nama penyetuju", "Tanggal persetujuan", "Prompt penilai kualitas", "Prompt penilai format"]) {
      expect(screen.getByLabelText(name)).toBeInTheDocument();
    }
    expect(screen.getByLabelText("Nama aspek 1")).toBeInTheDocument();
    expect(screen.getByLabelText("Jalur aspek 1")).toHaveValue("llm");
    expect(screen.queryByLabelText("Nama aspek 2")).not.toBeInTheDocument();
    for (const score of [5, 4, 3, 2, 1, 0]) expect(screen.getByLabelText(`Label skor ${score}`)).toBeInTheDocument();
  });

  // Positive (B1): the required fields say so, the optional ones do not.
  it("marks the required fields and leaves the optional ones unmarked", () => {
    // Arrange / Act
    setup();

    // Assert
    for (const name of ["Berlaku sejak", "Prompt penilai kualitas", "Prompt penilai format", "Label skor 3", "Nama aspek 1", "Definisi aspek 1"]) {
      expect(screen.getByLabelText(name)).toHaveAttribute("aria-required", "true");
    }
    for (const name of ["Nama penyetuju", "Tanggal persetujuan", "Bobot aspek 1", "Deskripsi aspek 1 skor 5"]) {
      expect(screen.getByLabelText(name)).not.toHaveAttribute("aria-required");
    }
  });

  // Positive (B1): the section nav lists the four kinds of section and ticks the complete ones.
  it("ticks a section in the nav once its required fields are filled", async () => {
    // Arrange
    const { user } = setup();
    const nav = screen.getByRole("navigation", { name: "Bagian formulir" });
    expect(within(nav).getByRole("link", { name: "Informasi versi, belum lengkap" })).toHaveAttribute("href", "#informasi");

    // Act
    await user.type(screen.getByLabelText("Berlaku sejak"), "2026-12-01");

    // Assert
    expect(within(nav).getByRole("link", { name: "Informasi versi, lengkap" })).toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Aspek 1, belum lengkap" })).toHaveAttribute("href", "#aspek-1");
  });

  // Positive (title): the title says which number the version will get, as the server will (max + 1).
  it("says which version number will be saved", () => {
    // Arrange / Act
    setup({ nextVersionNo: 9 });

    // Assert
    expect(screen.getByText("Akan disimpan sebagai Versi 9.")).toBeInTheDocument();
  });

  // Edge: the list did not load; edge because the number is then unknown and must not be guessed.
  it("leaves the number out when it is not known", () => {
    // Arrange / Act
    setup({ nextVersionNo: null });

    // Assert
    expect(screen.queryByText(/Akan disimpan sebagai/)).not.toBeInTheDocument();
  });

  it("marks only the scores 4 and 5 as passing on a fresh form", () => {
    // Arrange / Act
    setup();

    // Assert
    expect(screen.getByLabelText("Lulus skor 5")).toBeChecked();
    expect(screen.getByLabelText("Lulus skor 4")).toBeChecked();
    expect(screen.getByLabelText("Lulus skor 3")).not.toBeChecked();
    expect(screen.getByLabelText("Lulus skor 0")).not.toBeChecked();
  });

  // Positive (B2): one line under the scale says where the pass line is, and follows the ticks.
  it("summarises the pass line under the scale and follows the ticks", async () => {
    // Arrange
    const { user } = setup();
    expect(screen.getByText("Lulus: skor 5 dan 4. Tidak lulus: skor 3, 2, 1, 0.")).toBeInTheDocument();

    // Act
    await user.click(screen.getByLabelText("Lulus skor 4"));

    // Assert
    expect(screen.getByText("Lulus: skor 5. Tidak lulus: skor 4, 3, 2, 1, 0.")).toBeInTheDocument();
  });

  it("takes the weight as a number input", () => {
    // Arrange / Act
    setup();

    // Assert
    expect(screen.getByLabelText("Bobot aspek 1")).toHaveAttribute("type", "number");
  });

  // Positive: every field explains itself with a small note.
  it.each([
    ["Berlaku sejak", /mulai dipakai/i],
    ["Nama penyetuju", /tim legal.*menyetujui versi rubrik.*boleh dikosongkan/i],
    ["Tanggal persetujuan", /disetujui.*boleh dikosongkan/i],
    ["Prompt penilai kualitas", /penilai LLM.*kualitas/i],
    ["Prompt penilai format", /penilai LLM.*format/i],
    ["Nama aspek 1", /aspek yang dinilai/i],
    ["Jalur aspek 1", /deterministik.*LLM judge/i],
    ["Bobot aspek 1", /bobot/i],
    ["Definisi aspek 1", /arti aspek/i],
  ])("explains %s with a note under the label", (label, note) => {
    // Arrange / Act
    setup();

    // Assert
    expect(screen.getByLabelText(label)).toHaveAccessibleDescription(note);
  });

  // Positive (B3): each score's description shows that score's label next to it, from the scale above.
  it("shows the label of each score next to its description and follows edits", async () => {
    // Arrange
    const { user } = setup();

    // Act
    await user.type(screen.getByLabelText("Label skor 3"), "Sebagian benar");

    // Assert
    expect(screen.getByLabelText("Deskripsi aspek 1 skor 3")).toHaveAccessibleDescription("Sebagian benar");
  });

  // Positive (B2, B3): one shared note replaces the six repeated ones of the baseline.
  it("explains the scale and the descriptions once", () => {
    // Arrange / Act
    setup();

    // Assert
    expect(
      screen.getByText("Beri nama tiap skor. Nama ini tampil di hasil penilaian. Centang Lulus untuk skor yang dianggap lulus."),
    ).toBeInTheDocument();
    expect(screen.getByText("Ciri jawaban yang pantas mendapat skor tiap skor. Nama skor diambil dari Skala nilai.")).toBeInTheDocument();
  });

  // Positive: typed fields show a grey example of what to type.
  it.each([
    ["Nama penyetuju", /tim legal/i],
    ["Prompt penilai kualitas", /.+/],
    ["Prompt penilai format", /.+/],
    ["Label skor 5", /.+/],
    ["Nama aspek 1", /.+/],
    ["Bobot aspek 1", /\d+/],
    ["Definisi aspek 1", /.+/],
    ["Deskripsi aspek 1 skor 5", /.+/],
  ])("shows an example placeholder in %s", (label, example) => {
    // Arrange / Act
    setup();

    // Assert
    expect(screen.getByLabelText(label)).toHaveAttribute("placeholder", expect.stringMatching(example));
  });

  // Negative: a date input has a browser format, so it gets a note but no placeholder.
  it("gives the date fields a note and no placeholder", () => {
    // Arrange / Act
    setup();

    // Assert
    expect(screen.getByLabelText("Berlaku sejak")).not.toHaveAttribute("placeholder");
    expect(screen.getByLabelText("Tanggal persetujuan")).not.toHaveAttribute("placeholder");
  });

  // Edge: an added aspect explains itself too.
  it("shows the notes on an added aspect", async () => {
    // Arrange
    const { user } = setup();

    // Act
    await user.click(screen.getByRole("button", { name: "Tambah aspek" }));

    // Assert
    expect(screen.getByLabelText("Nama aspek 2")).toHaveAccessibleDescription(/aspek yang dinilai/i);
    expect(screen.getByLabelText("Bobot aspek 2")).toHaveAttribute("placeholder", expect.stringMatching(/\d+/));
  });

  // Positive: on an empty form the template fills right away, as in the prototype (B6).
  it("fills the dimensions, levels and descriptors from the v1 template", async () => {
    // Arrange
    const { user } = setup();

    // Act
    await user.click(templateButton());

    // Assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nama aspek 1")).toHaveValue("Kesimpulan");
    expect(screen.getByLabelText("Nama aspek 2")).toHaveValue("Dasar Hukum");
    expect(screen.getByLabelText("Nama aspek 3")).toHaveValue("Argumentasi");
    expect(screen.getByLabelText("Label skor 5")).toHaveValue("Sempurna dan Komprehensif");
    expect(screen.getByLabelText("Deskripsi aspek 2 skor 0")).toHaveValue(
      "AI mengarang pasal fiktif (halusinasi hukum) atau menggunakan undang-undang dari negara lain tanpa peringatan.",
    );
  });

  // Negative: the template does not make up what the client document leaves out.
  it("leaves approver, dates and prompts empty after the template", async () => {
    // Arrange
    const { user } = setup();

    // Act
    await user.click(templateButton());

    // Assert
    for (const name of ["Berlaku sejak", "Nama penyetuju", "Tanggal persetujuan", "Prompt penilai kualitas", "Prompt penilai format"]) {
      expect(screen.getByLabelText(name)).toHaveValue("");
    }
    expect(screen.getByLabelText("Definisi aspek 1")).toHaveValue("");
  });

  // Positive (B6): the template over typed text asks first, and Batal keeps the text.
  it("asks before the template replaces typed text and keeps it on Batal", async () => {
    // Arrange
    const { user } = setup();
    await user.type(screen.getByLabelText("Nama aspek 1"), "Kesimpulan saya");

    // Act
    await user.click(templateButton());
    const dialog = screen.getByRole("dialog", { name: "Timpa isian dengan template rubrik v1?" });
    await user.click(within(dialog).getByRole("button", { name: "Batal" }));

    // Assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nama aspek 1")).toHaveValue("Kesimpulan saya");
  });

  it("replaces the typed text with the template after Timpa isian", async () => {
    // Arrange
    const { user } = setup();
    await user.type(screen.getByLabelText("Nama aspek 1"), "Kesimpulan saya");

    // Act
    await user.click(templateButton());
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Timpa isian" }));

    // Assert
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByLabelText("Nama aspek 1")).toHaveValue("Kesimpulan");
  });

  // Positive (B6): Batal on an empty form leaves right away.
  it("leaves at once on Batal when nothing was typed", async () => {
    // Arrange
    const { user, onCancel } = setup();

    // Act
    await user.click(screen.getByRole("button", { name: "Batal" }));

    // Assert
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // Negative (B6): Batal on a filled form asks, and Lanjut mengisi stays.
  it("asks before Batal throws away typed text", async () => {
    // Arrange
    const { user, onCancel } = setup();
    await user.type(screen.getByLabelText("Prompt penilai kualitas"), "x");

    // Act
    await user.click(screen.getByRole("button", { name: "Batal" }));
    const dialog = screen.getByRole("dialog", { name: "Buang isian versi baru?" });
    await user.click(within(dialog).getByRole("button", { name: "Lanjut mengisi" }));

    // Assert
    expect(onCancel).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Prompt penilai kualitas")).toHaveValue("x");
  });

  it("leaves after Buang isian", async () => {
    // Arrange
    const { user, onCancel } = setup();
    await user.type(screen.getByLabelText("Prompt penilai kualitas"), "x");
    await user.click(screen.getByRole("button", { name: "Batal" }));

    // Act
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Buang isian" }));

    // Assert
    await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
  });

  // Edge (B6): the trail leaves the page too; edge because a plain link there would skip the question Batal asks.
  it("asks before the trail back to the list throws away typed text", async () => {
    // Arrange
    const { user, onCancel } = setup();
    await user.type(screen.getByLabelText("Nama aspek 1"), "x");

    // Act
    await user.click(within(screen.getByRole("navigation", { name: "Breadcrumb" })).getByRole("button", { name: "Rubrik penilaian" }));

    // Assert
    expect(screen.getByRole("dialog", { name: "Buang isian versi baru?" })).toBeInTheDocument();
    expect(onCancel).not.toHaveBeenCalled();
  });

  // Negative (B5): an empty required field stops the save in the browser, says where, and moves focus there.
  it("stops the save, names what is missing and focuses the first empty field", async () => {
    // Arrange
    const { user, gateway } = setup();
    await user.type(screen.getByLabelText("Berlaku sejak"), "2026-12-01");

    // Act
    await user.click(saveButton());

    // Assert
    expect(gateway.createVersion).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "10 isian wajib belum diisi di Prompt penilai, Skala nilai dan Aspek 1. Versi belum disimpan.",
    );
    const quality = screen.getByLabelText("Prompt penilai kualitas");
    expect(quality).toHaveFocus();
    expect(quality).toHaveAttribute("aria-invalid", "true");
    expect(quality).toHaveAccessibleDescription(expect.stringContaining("Isi prompt penilai kualitas."));
    expect(screen.getByText("10 isian wajib belum diisi.")).toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Bagian formulir" });
    expect(within(nav).getByRole("link", { name: "Prompt penilai, 2 isian kosong" })).toBeInTheDocument();
  });

  // Positive (B5): "Ke isian pertama" brings the Admin back to the first empty field after scrolling away.
  it("moves to the first empty field from the bottom bar", async () => {
    // Arrange
    const { user } = setup();
    await user.click(saveButton());
    await user.click(screen.getByLabelText("Nama penyetuju"));

    // Act
    await user.click(screen.getByRole("button", { name: "Ke isian pertama" }));

    // Assert
    expect(screen.getByLabelText("Berlaku sejak")).toHaveFocus();
  });

  // Edge (B5): a field's message goes away as soon as it is filled; edge because the errors are recomputed live, not frozen at the click.
  it("clears a field's message as soon as it is filled", async () => {
    // Arrange
    const { user } = setup();
    await user.click(saveButton());

    // Act
    await user.type(screen.getByLabelText("Berlaku sejak"), "2026-12-01");

    // Assert
    expect(screen.getByLabelText("Berlaku sejak")).not.toHaveAttribute("aria-invalid");
    expect(screen.getByRole("alert")).toHaveTextContent(/^10 isian wajib/);
  });

  // Positive (B4): a complete form opens the summary before anything is sent.
  it("shows the summary of what cannot change before saving", async () => {
    // Arrange
    const { user, gateway } = setup();
    await fillRequired(user);

    // Act
    await user.click(saveButton());

    // Assert
    const dialog = screen.getByRole("dialog", { name: "Simpan Versi 2?" });
    expect(dialog).toHaveTextContent("Periksa ringkasan di bawah. Setelah disimpan, versi ini tidak bisa diubah.");
    expect(dialog).toHaveTextContent("01 Des 2026");
    expect(dialog).toHaveTextContent("5 dan 4");
    expect(dialog).toHaveTextContent("1 · Kesimpulan · LLM judge");
    expect(gateway.createVersion).not.toHaveBeenCalled();
  });

  // Negative (B4): Kembali ke formulir sends nothing.
  it("sends nothing when the Admin goes back to the form", async () => {
    // Arrange
    const { user, gateway } = setup();
    await fillRequired(user);
    await user.click(saveButton());

    // Act
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Kembali ke formulir" }));

    // Assert
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(gateway.createVersion).not.toHaveBeenCalled();
  });

  // Edge (B4): unknown number; edge because the dialog must still work while the list is down.
  it("asks without a number when the next number is unknown", async () => {
    // Arrange
    const { user, gateway } = setup({ nextVersionNo: null });
    await fillRequired(user);

    // Act
    await saveAndConfirm(user, "Simpan versi");

    // Assert
    await waitFor(() => expect(gateway.createVersion).toHaveBeenCalledTimes(1));
  });

  // Positive: what is typed is what is sent, in the server's field names (AC8: the request is unchanged).
  it("sends what was typed as the create request", async () => {
    // Arrange
    const { user, gateway } = setup();
    await fillRequired(user);
    await user.selectOptions(screen.getByLabelText("Jalur aspek 1"), "deterministic");
    await user.click(screen.getByLabelText("Lulus skor 4"));
    await fill(user, "Bobot aspek 1", "100");
    await fill(user, "Nama penyetuju", "Steven & Deanne");
    await user.type(screen.getByLabelText("Tanggal persetujuan"), "2026-10-27");

    // Act
    await saveAndConfirm(user);

    // Assert
    await waitFor(() => expect(gateway.createVersion).toHaveBeenCalledTimes(1));
    const request = vi.mocked(gateway.createVersion).mock.calls[0][0];
    expect(request).toMatchObject({
      effective_date: "2026-12-01",
      judge_prompt_quality: "Nilai kualitas.",
      judge_prompt_format: "Nilai format.",
      approved_by_name: "Steven & Deanne",
      approved_at: "2026-10-27",
    });
    expect(request.aspects[0]).toMatchObject({ name: "Kesimpulan", grader_path: "deterministic", weight: 100, definition: "Definisi 1" });
    expect(request.levels.find((level) => level.score === 4)?.is_passing).toBe(false);
    expect(request.levels[0].descriptors?.[0]).toEqual({
      aspect_name: "Kesimpulan",
      descriptor: "AI memberikan jawaban yang sepenuhnya benar dan tepat sasaran.",
    });
  });

  it("tells the page about the new version", async () => {
    // Arrange
    const { user, onCreated } = setup();
    await fillRequired(user);

    // Act
    await saveAndConfirm(user);

    // Assert
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: "v-2", version_no: 2 })));
  });

  // Negative: the server names the field it refused; the message sits beside that input.
  it("shows a 422 beside the field the server named and marks it invalid", async () => {
    // Arrange
    const refusal = new ApiError(422, "VALIDATION_ERROR", "Bobot harus berjumlah 100", "aspects[0].weight");
    const { user, onCreated } = setup({ createVersion: vi.fn().mockRejectedValue(refusal) });
    await fillRequired(user);

    // Act
    await saveAndConfirm(user);

    // Assert
    const weight = await screen.findByLabelText("Bobot aspek 1");
    await waitFor(() => expect(weight).toHaveAttribute("aria-invalid", "true"));
    expect(weight).toHaveAccessibleDescription(expect.stringContaining("Bobot harus berjumlah 100"));
    expect(screen.getByRole("alert")).toHaveTextContent("Bobot harus berjumlah 100");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nama aspek 1")).not.toHaveAttribute("aria-invalid", "true");
  });

  it("shows a 422 on the path beside the path choice and marks it invalid", async () => {
    // Arrange
    const refusal = new ApiError(422, "VALIDATION_ERROR", "Jalur penilaian tidak dikenal", "aspects[0].grader_path");
    const { user } = setup({ createVersion: vi.fn().mockRejectedValue(refusal) });
    await fillRequired(user);

    // Act
    await saveAndConfirm(user);

    // Assert
    const path = await screen.findByLabelText("Jalur aspek 1");
    await waitFor(() => expect(path).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByText("Jalur penilaian tidak dikenal", { selector: "p:not([role='alert'])" })).toBeInTheDocument();
  });

  it("keeps what was typed when the server refuses", async () => {
    // Arrange
    const refusal = new ApiError(422, "VALIDATION_ERROR", "Nama aspek sudah dipakai", "aspects[1].name");
    const { user } = setup({ createVersion: vi.fn().mockRejectedValue(refusal) });
    await fillRequired(user);

    // Act
    await saveAndConfirm(user);

    // Assert
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Prompt penilai kualitas")).toHaveValue("Nilai kualitas.");
  });

  it("explains a role change on a 403 without marking any field", async () => {
    // Arrange
    const { user } = setup({ createVersion: vi.fn().mockRejectedValue(new ApiError(403, "FORBIDDEN")) });
    await fillRequired(user);

    // Act
    await saveAndConfirm(user);

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Peran Anda tidak lagi boleh membuat versi rubrik. Muat ulang halaman.");
    expect(document.querySelector("[aria-invalid='true']")).toBeNull();
  });

  // Edge: a double click on the final button must not create two versions.
  it("shows Menyimpan while saving and sends one request for a double click", async () => {
    // Arrange
    let finish: (value: ReturnType<typeof makeRubricVersion>) => void = () => undefined;
    const pendingRequest = new Promise<ReturnType<typeof makeRubricVersion>>((resolve) => {
      finish = resolve;
    });
    const { user, gateway } = setup({ createVersion: vi.fn().mockReturnValue(pendingRequest) });
    await fillRequired(user);
    await user.click(saveButton());

    // Act
    await user.dblClick(within(screen.getByRole("dialog")).getByRole("button", { name: "Simpan Versi 2" }));

    // Assert
    expect(within(screen.getByRole("dialog")).getByRole("button", { name: "Menyimpan…" })).toBeDisabled();
    expect(gateway.createVersion).toHaveBeenCalledTimes(1);
    finish(makeRubricVersion());
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  // Positive: more than one dimension is possible.
  it("adds a blank aspect and lets the first one be removed", async () => {
    // Arrange
    const { user } = setup();

    // Act
    await user.click(screen.getByRole("button", { name: "Tambah aspek" }));

    // Assert
    expect(screen.getByLabelText("Nama aspek 2")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Hapus aspek 1" })).toBeEnabled();
    expect(within(screen.getByRole("navigation", { name: "Bagian formulir" })).getByRole("link", { name: /^Aspek 2/ })).toBeInTheDocument();
  });

  it("removes an added aspect", async () => {
    // Arrange
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Tambah aspek" }));

    // Act
    await user.click(screen.getByRole("button", { name: "Hapus aspek 2" }));

    // Assert
    expect(screen.queryByLabelText("Nama aspek 2")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Nama aspek 1")).toBeInTheDocument();
  });

  // Negative: a version needs at least one aspect, so the only one cannot be removed.
  it("does not let the last aspect be removed", () => {
    // Arrange / Act
    setup();

    // Assert
    expect(screen.getByRole("button", { name: "Hapus aspek 1" })).toBeDisabled();
  });

  // Edge: the editor of an aspect that stays must stay the same element, so focus and cursor survive.
  it("keeps the editor of the aspects that stay when another one is removed", async () => {
    // Arrange
    const { user } = setup();
    await user.click(templateButton());
    const thirdBefore = screen.getByLabelText("Nama aspek 3");

    // Act
    await user.click(screen.getByRole("button", { name: "Hapus aspek 1" }));

    // Assert
    expect(screen.getByLabelText("Nama aspek 2")).toBe(thirdBefore);
  });

  it("removes the aspect it names and keeps the others", async () => {
    // Arrange
    const { user } = setup();
    await user.click(templateButton());

    // Act
    await user.click(screen.getByRole("button", { name: "Hapus aspek 2" }));

    // Assert
    expect(screen.getByLabelText("Nama aspek 1")).toHaveValue("Kesimpulan");
    expect(screen.getByLabelText("Nama aspek 2")).toHaveValue("Argumentasi");
    expect(screen.queryByLabelText("Nama aspek 3")).not.toBeInTheDocument();
  });
});
