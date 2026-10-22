import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { AuditActor } from "@/lib/audit/auditApi";
import type { AuditFilter } from "@/types/audit";
import { AuditFilterBar } from "./AuditFilterBar";

const FILTER: AuditFilter = { from: "2026-07-09", to: "2026-10-07", page: 1 };

const ACTORS: AuditActor[] = [
  { id: "u1", name: "Herdayani", email: "h@veritask.test", role: "author", is_active: true },
  { id: "u2", name: "Roben", email: "r@veritask.test", role: "reviewer", is_active: false },
];

function setup(value: AuditFilter = FILTER, actors: AuditActor[] = ACTORS) {
  const onChange = vi.fn();
  render(
    <AuditFilterBar
      value={value}
      actors={actors}
      minDate="2026-07-09"
      maxDate="2026-10-07"
      onChange={onChange}
    />,
  );
  return { onChange };
}

describe("AuditFilterBar", () => {
  // AC7: rentang tanggal tidak boleh keluar dari 90 hari terakhir.
  it("keeps the date inputs inside the ninety day window", () => {
    setup();

    for (const label of ["Dari tanggal", "Sampai tanggal"]) {
      const input = screen.getByLabelText(label);
      expect(input).toHaveAttribute("min", "2026-07-09");
      expect(input).toHaveAttribute("max", "2026-10-07");
    }
  });

  // Positive
  it("hands over the new start date", () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByLabelText("Dari tanggal"), {
      target: { value: "2026-09-01" },
    });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ from: "2026-09-01" }));
  });

  // AC3: pengguna nonaktif ikut, dan ditandai supaya tidak membingungkan.
  it("offers deactivated users too, marked as such", () => {
    setup();

    expect(
      screen.getByRole("option", { name: "Herdayani (h@veritask.test)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Roben (r@veritask.test) (nonaktif)" }),
    ).toBeInTheDocument();
  });

  // Positive: the reason for this change, two people with one name.
  it("tells apart two users who share a name by their email", () => {
    setup(FILTER, [
      { id: "u1", name: "Rina Sari", email: "rina.a@veritask.ai", role: "author", is_active: true },
      { id: "u2", name: "Rina Sari", email: "rina.b@veritask.ai", role: "author", is_active: true },
    ]);

    expect(
      screen.getByRole("option", { name: "Rina Sari (rina.a@veritask.ai)" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("option", { name: "Rina Sari (rina.b@veritask.ai)" }),
    ).toBeInTheDocument();
  });

  // Positive: the visible label changes, the value sent to the server does not.
  it("hands over the id of the user picked by email", async () => {
    const { onChange } = setup(FILTER, [
      { id: "u1", name: "Rina Sari", email: "rina.a@veritask.ai", role: "author", is_active: true },
      { id: "u2", name: "Rina Sari", email: "rina.b@veritask.ai", role: "author", is_active: true },
    ]);

    await userEvent.selectOptions(
      screen.getByLabelText("Pelaku"),
      screen.getByRole("option", { name: "Rina Sari (rina.b@veritask.ai)" }),
    );

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ actor_id: "u2" }));
  });

  // Positive
  it("hands over the chosen actor", async () => {
    const { onChange } = setup();

    await userEvent.selectOptions(screen.getByLabelText("Pelaku"), "u2");

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ actor_id: "u2" }));
  });

  // Corner: kembali ke "semua" harus menghapus saringan, bukan mengirim string kosong.
  it("drops the actor again when the reader picks everyone", async () => {
    const { onChange } = setup({ ...FILTER, actor_id: "u2" });

    await userEvent.selectOptions(screen.getByLabelText("Pelaku"), "");

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ actor_id: undefined }));
  });
  

  // Positive
  it("hands over the new end date", () => {
    const { onChange } = setup();

    fireEvent.change(screen.getByLabelText("Sampai tanggal"), {
      target: { value: "2026-10-01" },
    });

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ to: "2026-10-01" }));
  });

  // Positive
  it("drops the entity type again when the reader picks every type", async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ ...FILTER, entity_type: "suite" });

    await user.selectOptions(screen.getByLabelText("Jenis data"), "");

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ entity_type: undefined }));
  });

  // Positive: F-06
  it("hands over the case code when the reader presses Enter", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.type(screen.getByLabelText("Kode kasus"), "UAT-PHK-001{Enter}");

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ case_code: "UAT-PHK-001" }),
    );
  });

  // Positive
  it("hands over the case code when the reader leaves the field", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.type(screen.getByLabelText("Kode kasus"), "  PHK ");
    await user.tab();

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ case_code: "PHK" }));
  });

  // Positive
  it("does not search on every keystroke", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.type(screen.getByLabelText("Kode kasus"), "PHK");

    expect(onChange).not.toHaveBeenCalled();
  });

  // Negative
  it("drops the case code again when the reader clears the field", async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ ...FILTER, case_code: "PHK" });

    await user.clear(screen.getByLabelText("Kode kasus"));
    await user.keyboard("{Enter}");

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ case_code: undefined }));
  });

  // Corner
  it("does not ask again when the code did not change", async () => {
    const user = userEvent.setup();
    const { onChange } = setup({ ...FILTER, case_code: "PHK" });

    await user.click(screen.getByLabelText("Kode kasus"));
    await user.keyboard("{Enter}");
    await user.tab();

    expect(onChange).not.toHaveBeenCalled();
  });

  // Corner: spaces only count as empty.
  it("does not search for spaces only", async () => {
    const user = userEvent.setup();
    const { onChange } = setup();

    await user.type(screen.getByLabelText("Kode kasus"), "   {Enter}");

    expect(onChange).not.toHaveBeenCalled();
  });

  // Corner: the server accepts at most 64 characters.
  it("shows the current code and stops at 64 characters", () => {
    setup({ ...FILTER, case_code: "PHK" });

    const input = screen.getByLabelText("Kode kasus");
    expect(input).toHaveValue("PHK");
    expect(input).toHaveAttribute("maxLength", "64");
  });
});
