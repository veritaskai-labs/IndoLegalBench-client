import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AuditPager } from "./AuditPager";

describe("AuditPager", () => {
  describe("halaman di tengah", () => {
    it("shows where the reader is", () => {
      render(<AuditPager page={2} lastPage={3} onPageChange={vi.fn()} />);

      expect(screen.getByText("Halaman 2 dari 3")).toBeInTheDocument();
    });

    it.each([
      ["Sebelumnya", 1],
      ["Berikutnya", 3],
    ])("asks for the page behind %s", async (label, expected) => {
      const user = userEvent.setup();
      const onPageChange = vi.fn();
      render(<AuditPager page={2} lastPage={3} onPageChange={onPageChange} />);

      await user.click(screen.getByRole("button", { name: label }));

      expect(onPageChange).toHaveBeenCalledWith(expected);
    });
  });

  describe("halaman di ujung", () => {
    it("disables Sebelumnya on the first page", () => {
      render(<AuditPager page={1} lastPage={3} onPageChange={vi.fn()} />);

      expect(screen.getByRole("button", { name: "Sebelumnya" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "Berikutnya" })).toBeEnabled();
    });

    it("disables Berikutnya on the last page", () => {
      render(<AuditPager page={3} lastPage={3} onPageChange={vi.fn()} />);

      expect(screen.getByRole("button", { name: "Sebelumnya" })).toBeEnabled();
      expect(screen.getByRole("button", { name: "Berikutnya" })).toBeDisabled();
    });
  });
});
