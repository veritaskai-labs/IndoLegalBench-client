import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TrendNotices } from "./TrendNotices";

describe("TrendNotices (AC11)", () => {
  // Positive
  it("shows every warning as a status message", () => {
    // Arrange / Act
    render(<TrendNotices warnings={["Tidak ada kasus yang sama.", "Ada peringatan lain."]} />);

    // Assert
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent("Tidak ada kasus yang sama.");
    expect(notice).toHaveTextContent("Ada peringatan lain.");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  // Edge case
  it("renders nothing when there is no warning", () => {
    // Arrange / Act
    const { container } = render(<TrendNotices warnings={[]} />);

    // Assert
    expect(container).toBeEmptyDOMElement();
  });
});
