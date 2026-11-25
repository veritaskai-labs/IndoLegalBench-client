import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button } from "./Button";

describe("Button", () => {
  it("renders the primary variant in ink black by default", () => {
    // Arrange + Act
    render(<Button>Simpan</Button>);

    // Assert
    const button = screen.getByRole("button", { name: "Simpan" });
    expect(button).toHaveClass("bg-ink", "text-paper", "h-9");
    expect(button).toHaveAttribute("type", "button");
  });

  it.each([
    ["accent", "bg-accent"],
    ["ghost", "border-line"],
    ["danger", "bg-danger"],
  ] as const)("applies the %s variant classes", (variant, expectedClass) => {
    render(<Button variant={variant}>Aksi</Button>);

    expect(screen.getByRole("button", { name: "Aksi" })).toHaveClass(expectedClass);
  });

  it("uses the compact height for the small size", () => {
    render(<Button size="sm">Kecil</Button>);

    expect(screen.getByRole("button", { name: "Kecil" })).toHaveClass("h-8");
  });

  it("calls onClick when pressed", async () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Klik</Button>);

    await userEvent.click(screen.getByRole("button", { name: "Klik" }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("does not call onClick while disabled", async () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Mati
      </Button>,
    );

    await userEvent.click(screen.getByRole("button", { name: "Mati" }));

    expect(onClick).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Mati" })).toBeDisabled();
  });
});
