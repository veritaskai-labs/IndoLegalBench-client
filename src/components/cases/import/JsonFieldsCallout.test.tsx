import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { JSON_FORMAT_REASON, jsonListColumns } from "@/lib/cases/importGuide";
import { JsonFieldsCallout } from "./JsonFieldsCallout";

describe("JsonFieldsCallout (SCRUM-380, sorotan kolom berformat JSON)", () => {
  // Positive: the heading, the reason and every JSON field are visible without opening anything.
  it("shows the heading, the reason and one item per JSON field", () => {
    // Arrange
    const columns = jsonListColumns();

    // Act
    render(<JsonFieldsCallout columns={columns} />);

    // Assert
    expect(screen.getByRole("heading", { level: 2, name: "Kolom yang wajib berformat list JSON" })).toBeInTheDocument();
    expect(screen.getByText(JSON_FORMAT_REASON)).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")).toHaveLength(3);
  });

  // Positive: each item names the column, carries the badge, and shows the example exactly as it must be written.
  it("shows the column name, the Format JSON badge and the example of every field", () => {
    // Arrange
    const columns = jsonListColumns();

    // Act
    render(<JsonFieldsCallout columns={columns} />);

    // Assert
    const items = screen.getAllByRole("listitem");
    columns.forEach((column, index) => {
      expect(within(items[index]).getByText(column.name)).toBeInTheDocument();
      expect(within(items[index]).getByText("Format JSON")).toBeInTheDocument();
      expect(within(items[index]).getByText(column.example)).toBeInTheDocument();
    });
  });

  // Positive: every field has its own copy button, named by the field.
  it("gives every field a copy button named after it", () => {
    // Arrange / Act
    render(<JsonFieldsCallout columns={jsonListColumns()} />);

    // Assert
    expect(screen.getByRole("button", { name: "Salin contoh legal_refs" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salin contoh must_contain" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salin contoh must_not_contain" })).toBeInTheDocument();
  });

  // Edge: no JSON column means nothing to highlight, so no empty box is drawn.
  it("renders nothing when there are no JSON columns", () => {
    // Arrange / Act
    const { container } = render(<JsonFieldsCallout columns={[]} />);

    // Assert
    expect(container).toBeEmptyDOMElement();
  });

  // Edge: the list is a named landmark region so a screen reader can jump to it.
  it("is a region labelled by its heading", () => {
    // Arrange / Act
    render(<JsonFieldsCallout columns={jsonListColumns()} />);

    // Assert
    expect(screen.getByRole("region", { name: "Kolom yang wajib berformat list JSON" })).toBeInTheDocument();
  });
});
