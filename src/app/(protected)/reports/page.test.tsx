import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ReportsPage from "./page";

describe("ReportsPage", () => {
  it("shows the placeholder title and description", () => {
    render(<ReportsPage />);

    expect(screen.getByRole("heading", { level: 1, name: "Halaman Laporan" })).toBeInTheDocument();
    expect(
      screen.getByText("Fitur laporan perbandingan belum tersedia dan akan hadir pada sprint berikutnya."),
    ).toBeInTheDocument();
  });
});