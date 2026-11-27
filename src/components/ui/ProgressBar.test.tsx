import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressBar } from "./ProgressBar";

describe("ProgressBar", () => {
  it("shows the rounded percent under its accessible name", () => {
    render(<ProgressBar percent={34.6} label="Persen kasus selesai" />);

    const bar = screen.getByRole("progressbar", { name: "Persen kasus selesai" });
    expect(bar).toHaveAttribute("value", "35");
    expect(bar).toHaveAttribute("max", "100");
  });

  it.each([
    [140, "100"],
    [-5, "0"],
    [Number.NaN, "0"],
  ])("keeps %s inside the track as %s", (percent, expected) => {
    render(<ProgressBar percent={percent} label="Progres" />);

    expect(screen.getByRole("progressbar", { name: "Progres" })).toHaveAttribute("value", expected);
  });
});
