import { render, screen } from "@testing-library/react";
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

function setup(value: AuditFilter = FILTER) {
  const onChange = vi.fn();
  render(
    <AuditFilterBar
      value={value}
      actors={ACTORS}
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
  it("hands over the new start date", async () => {
    const { onChange } = setup();

    const from = screen.getByLabelText("Dari tanggal");
    await userEvent.clear(from);
    await userEvent.type(from, "2026-09-01");

    expect(onChange).toHaveBeenLastCalledWith(expect.objectContaining({ from: "2026-09-01" }));
  });

  // AC3: pengguna nonaktif ikut, dan ditandai supaya tidak membingungkan.
  it("offers deactivated users too, marked as such", () => {
    setup();

    expect(screen.getByRole("option", { name: "Herdayani" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Roben (nonaktif)" })).toBeInTheDocument();
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
});