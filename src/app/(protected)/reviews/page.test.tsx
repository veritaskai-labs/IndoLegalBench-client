import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ReviewsPage from "./page";

describe("ReviewsPage", () => {
  it("shows the placeholder title and description", () => {
    render(<ReviewsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Halaman Review" })).toBeInTheDocument();
    expect(
      screen.getByText("Fitur review kasus belum tersedia dan akan hadir pada sprint berikutnya."),
    ).toBeInTheDocument();
  });
});