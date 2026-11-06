import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/apiClient";
import { makeFakeGateway, makeRubricVersion } from "@/test/rubricFixtures";
import { RubricVersionForm } from "./RubricVersionForm";

function setup(createVersion = vi.fn().mockResolvedValue(makeRubricVersion({ id: "v-2", version_no: 2 }))) {
  const gateway = makeFakeGateway({ createVersion });
  const onCreated = vi.fn();
  render(<RubricVersionForm gateway={gateway} onCreated={onCreated} />);
  return { gateway, onCreated, user: userEvent.setup() };
}

const submit = () => screen.getByRole("button", { name: "Simpan versi baru" });

describe("RubricVersionForm (AC7: form membuat versi baru)", () => {
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

  it("marks only the scores 4 and 5 as passing on a fresh form", () => {
    // Arrange / Act
    setup();

    // Assert
    expect(screen.getByLabelText("Lulus skor 5")).toBeChecked();
    expect(screen.getByLabelText("Lulus skor 4")).toBeChecked();
    expect(screen.getByLabelText("Lulus skor 3")).not.toBeChecked();
    expect(screen.getByLabelText("Lulus skor 0")).not.toBeChecked();
  });

  it("takes the weight as a number input", () => {
    // Arrange / Act
    setup();

    // Assert
    expect(screen.getByLabelText("Bobot aspek 1")).toHaveAttribute("type", "number");
  });

  // Positive: the template of the client rubric v1 fills the form.
  it("fills the dimensions, levels and descriptors from the v1 template", async () => {
    // Arrange
    const { user } = setup();

    // Act
    await user.click(screen.getByRole("button", { name: "Isi dari template rubrik v1" }));

    // Assert
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
    await user.click(screen.getByRole("button", { name: "Isi dari template rubrik v1" }));

    // Assert
    for (const name of ["Berlaku sejak", "Nama penyetuju", "Tanggal persetujuan", "Prompt penilai kualitas", "Prompt penilai format"]) {
      expect(screen.getByLabelText(name)).toHaveValue("");
    }
    expect(screen.getByLabelText("Definisi aspek 1")).toHaveValue("");
  });

  // Positive: what is typed is what is sent, in the server's field names.
  it("sends what was typed as the create request", async () => {
    // Arrange
    const { user, gateway } = setup();
    await user.type(screen.getByLabelText("Berlaku sejak"), "2026-11-06");
    await user.type(screen.getByLabelText("Prompt penilai kualitas"), "Nilai kualitas.");
    await user.type(screen.getByLabelText("Prompt penilai format"), "Nilai format.");
    await user.type(screen.getByLabelText("Nama aspek 1"), "Kesimpulan");
    await user.type(screen.getByLabelText("Definisi aspek 1"), "Ketepatan hasil akhir");
    await user.type(screen.getByLabelText("Bobot aspek 1"), "100");
    await user.type(screen.getByLabelText("Deskripsi aspek 1 skor 5"), "Benar");
    await user.type(screen.getByLabelText("Label skor 5"), "Sempurna");

    // Act
    await user.click(submit());

    // Assert
    await waitFor(() => expect(gateway.createVersion).toHaveBeenCalledTimes(1));
    const request = vi.mocked(gateway.createVersion).mock.calls[0][0];
    expect(request).toMatchObject({
      effective_date: "2026-11-06",
      judge_prompt_quality: "Nilai kualitas.",
      judge_prompt_format: "Nilai format.",
      approved_by_name: null,
      approved_at: null,
    });
    expect(request.aspects[0]).toMatchObject({
      name: "Kesimpulan",
      grader_path: "llm",
      weight: 100,
      definition: "Ketepatan hasil akhir",
      sort_order: 1,
      level_descriptors: [{ score: 5, text: "Benar" }],
    });
    expect(request.levels[0]).toEqual({ score: 5, label: "Sempurna", is_passing: true });
  });

  it("sends the path and the passing mark the Admin changed", async () => {
    // Arrange
    const { user, gateway } = setup();
    await user.selectOptions(screen.getByLabelText("Jalur aspek 1"), "deterministic");
    await user.click(screen.getByLabelText("Lulus skor 4"));

    // Act
    await user.click(submit());

    // Assert
    await waitFor(() => expect(gateway.createVersion).toHaveBeenCalledTimes(1));
    const request = vi.mocked(gateway.createVersion).mock.calls[0][0];
    expect(request.aspects[0].grader_path).toBe("deterministic");
    expect(request.levels.find((level) => level.score === 4)?.is_passing).toBe(false);
  });

  // Positive: the approver is optional, but when it is typed it goes out with its date.
  it("sends the approver name and the approval date when they are typed", async () => {
    // Arrange
    const { user, gateway } = setup();
    await user.type(screen.getByLabelText("Nama penyetuju"), "Steven & Deanne");
    await user.type(screen.getByLabelText("Tanggal persetujuan"), "2026-10-27");

    // Act
    await user.click(submit());

    // Assert
    await waitFor(() => expect(gateway.createVersion).toHaveBeenCalledTimes(1));
    expect(vi.mocked(gateway.createVersion).mock.calls[0][0]).toMatchObject({
      approved_by_name: "Steven & Deanne",
      approved_at: "2026-10-27",
    });
  });

  // Edge: the rules live on the server, so even an empty form goes out and the server answers 422.
  it("sends an empty form to the server instead of judging it in the browser", async () => {
    // Arrange
    const { user, gateway } = setup();

    // Act
    await user.click(submit());

    // Assert
    await waitFor(() => expect(gateway.createVersion).toHaveBeenCalledTimes(1));
    expect(vi.mocked(gateway.createVersion).mock.calls[0][0]).toMatchObject({ effective_date: "", judge_prompt_quality: "" });
  });

  it("tells the page about the new version and starts a fresh form", async () => {
    // Arrange
    const { user, onCreated } = setup();
    await user.type(screen.getByLabelText("Nama aspek 1"), "Kesimpulan");

    // Act
    await user.click(submit());

    // Assert
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ id: "v-2", version_no: 2 })));
    expect(screen.getByLabelText("Nama aspek 1")).toHaveValue("");
  });

  // Negative: the server names the field it refused; the message sits beside that input.
  it("shows a 422 beside the field the server named and marks it invalid", async () => {
    // Arrange
    const refusal = new ApiError(422, "VALIDATION_ERROR", "Bobot harus berjumlah 100", "aspects[0].weight");
    const { user, onCreated } = setup(vi.fn().mockRejectedValue(refusal));

    // Act
    await user.click(submit());

    // Assert
    const weight = await screen.findByLabelText("Bobot aspek 1");
    await waitFor(() => expect(weight).toHaveAttribute("aria-invalid", "true"));
    const describedBy = weight.getAttribute("aria-describedby") ?? "";
    expect(document.getElementById(describedBy)).toHaveTextContent("Bobot harus berjumlah 100");
    expect(screen.getByRole("alert")).toHaveTextContent("Bobot harus berjumlah 100");
    expect(onCreated).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nama aspek 1")).not.toHaveAttribute("aria-invalid", "true");
  });

  it("shows a 422 on the path beside the path choice and marks it invalid", async () => {
    // Arrange
    const refusal = new ApiError(422, "VALIDATION_ERROR", "Jalur penilaian tidak dikenal", "aspects[0].grader_path");
    const { user } = setup(vi.fn().mockRejectedValue(refusal));

    // Act
    await user.click(submit());

    // Assert
    const path = await screen.findByLabelText("Jalur aspek 1");
    await waitFor(() => expect(path).toHaveAttribute("aria-invalid", "true"));
    expect(screen.getByText("Jalur penilaian tidak dikenal", { selector: "p:not([role='alert'])" })).toBeInTheDocument();
    expect(screen.getByLabelText("Nama aspek 1")).not.toHaveAttribute("aria-invalid", "true");
  });

  it("keeps what was typed when the server refuses", async () => {
    // Arrange
    const refusal = new ApiError(422, "VALIDATION_ERROR", "Nama aspek wajib diisi", "aspects[0].name");
    const { user } = setup(vi.fn().mockRejectedValue(refusal));
    await user.type(screen.getByLabelText("Prompt penilai kualitas"), "Nilai kualitas.");

    // Act
    await user.click(submit());

    // Assert
    await screen.findByRole("alert");
    expect(screen.getByLabelText("Prompt penilai kualitas")).toHaveValue("Nilai kualitas.");
  });

  it("explains a role change on a 403 without marking any field", async () => {
    // Arrange
    const { user } = setup(vi.fn().mockRejectedValue(new ApiError(403, "FORBIDDEN")));

    // Act
    await user.click(submit());

    // Assert
    expect(await screen.findByRole("alert")).toHaveTextContent("Peran Anda tidak lagi boleh membuat versi rubrik. Muat ulang halaman.");
    expect(document.querySelector("[aria-invalid='true']")).toBeNull();
  });

  // Edge: a double click must not create two versions.
  it("shows Menyimpan while saving and sends one request for a double click", async () => {
    // Arrange
    let finish: (value: ReturnType<typeof makeRubricVersion>) => void = () => undefined;
    const pendingRequest = new Promise<ReturnType<typeof makeRubricVersion>>((resolve) => {
      finish = resolve;
    });
    const { user, gateway } = setup(vi.fn().mockReturnValue(pendingRequest));

    // Act
    await user.dblClick(submit());

    // Assert
    expect(screen.getByRole("button", { name: "Menyimpan…" })).toBeDisabled();
    expect(gateway.createVersion).toHaveBeenCalledTimes(1);
    finish(makeRubricVersion());
    await waitFor(() => expect(submit()).toBeEnabled());
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

  it("removes the aspect it names and keeps the others", async () => {
    // Arrange
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Isi dari template rubrik v1" }));

    // Act
    await user.click(screen.getByRole("button", { name: "Hapus aspek 2" }));

    // Assert
    expect(screen.getByLabelText("Nama aspek 1")).toHaveValue("Kesimpulan");
    expect(screen.getByLabelText("Nama aspek 2")).toHaveValue("Argumentasi");
    expect(screen.queryByLabelText("Nama aspek 3")).not.toBeInTheDocument();
  });
});
