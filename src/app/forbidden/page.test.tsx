import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import ForbiddenPage from "./page";

describe("ForbiddenPage", () => {
  it("explains the user has no access", () => {
    render(<ForbiddenPage />);
    expect(screen.getByText("Anda tidak punya akses")).toBeInTheDocument();
  });

  it("links back to /auth/done so the user lands on their own home page", () => {
    render(<ForbiddenPage />);
    expect(screen.getByRole("link", { name: "Kembali ke halaman kerja" })).toHaveAttribute(
      "href",
      "/auth/done",
    );
  });
});