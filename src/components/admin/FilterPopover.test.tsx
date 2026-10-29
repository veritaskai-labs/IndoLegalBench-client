import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { FilterPopover } from "./FilterPopover";

function renderPopover(overrides: Partial<Parameters<typeof FilterPopover>[0]> = {}) {
  const props = {
    isOpen: true,
    selectedRoles: [],
    activeStatus: "all" as const,
    onClose: vi.fn(),
    onApply: vi.fn(),
    ...overrides,
  };
  render(<FilterPopover {...props} />);
  return props;
}

describe("FilterPopover", () => {
  // PBI-24 AC1: the role filter lists the same roles as the role picker.
  it("lists Admin, Kontributor and Viewer as role filters", () => {
    renderPopover();

    const labels = screen.getAllByRole("checkbox").map((box) => box.closest("label")?.textContent);

    expect(labels).toEqual(["Admin", "Kontributor", "Viewer"]);
  });

  it("applies the contributor role when Kontributor is ticked", async () => {
    const props = renderPopover();

    await userEvent.click(screen.getByLabelText("Kontributor"));
    await userEvent.click(screen.getByRole("button", { name: "Apply" }));

    expect(props.onApply).toHaveBeenCalledWith(["contributor"], "all");
    expect(props.onClose).toHaveBeenCalled();
  });

  it("starts with the roles that are already selected", () => {
    renderPopover({ selectedRoles: ["contributor"] });

    expect(screen.getByLabelText("Kontributor")).toBeChecked();
    expect(screen.getByLabelText("Admin")).not.toBeChecked();
  });

  it("renders nothing while closed", () => {
    renderPopover({ isOpen: false });

    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});
