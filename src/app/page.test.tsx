import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "./page";

describe("Home", () => {
  it("renders the product name as the top-level heading", () => {
    render(<Home />);

    expect(
      screen.getByRole("heading", { level: 1, name: "IndoLegalBench" }),
    ).toBeInTheDocument();
  });

  it("shows the three capabilities the platform is built around", () => {
    render(<Home />);

    for (const capability of ["Authoring", "Review", "Measurement"]) {
      expect(
        screen.getByRole("heading", { level: 2, name: capability }),
      ).toBeInTheDocument();
    }
  });
});
