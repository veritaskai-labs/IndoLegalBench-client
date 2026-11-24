import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Pager } from "./Pager";

describe("Pager", () => {
  it("shows the position and moves to the neighbouring pages", async () => {
    const onPageChange = vi.fn();
    render(<Pager page={2} lastPage={3} onPageChange={onPageChange} />);

    await userEvent.click(screen.getByRole("button", { name: "Sebelumnya" }));
    await userEvent.click(screen.getByRole("button", { name: "Berikutnya" }));

    expect(screen.getByText("Halaman 2 dari 3")).toBeInTheDocument();
    expect(onPageChange.mock.calls).toEqual([[1], [3]]);
  });

  it("disables Sebelumnya on the first page and Berikutnya on the last", () => {
    const { rerender } = render(<Pager page={1} lastPage={2} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Sebelumnya" })).toBeDisabled();

    rerender(<Pager page={2} lastPage={2} onPageChange={() => {}} />);
    expect(screen.getByRole("button", { name: "Berikutnya" })).toBeDisabled();
  });

  it("uses the shared ghost button look", () => {
    render(<Pager page={1} lastPage={2} onPageChange={() => {}} />);

    expect(screen.getByRole("button", { name: "Berikutnya" })).toHaveClass("border-line", "h-8");
  });
});
