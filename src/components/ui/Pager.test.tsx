import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { LocaleProvider } from "@/lib/i18n/LocaleProvider";
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

  it("names the pages in English when that language is on screen", async () => {
    const onPageChange = vi.fn();
    render(
      <LocaleProvider locale="en">
        <Pager page={2} lastPage={3} onPageChange={onPageChange} />
      </LocaleProvider>,
    );

    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Previous" }));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(onPageChange.mock.calls).toEqual([[1], [3]]);
  });

  it("uses the shared ghost button look", () => {
    render(<Pager page={1} lastPage={2} onPageChange={() => {}} />);

    expect(screen.getByRole("button", { name: "Berikutnya" })).toHaveClass("border-line", "h-8");
  });
});
