import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Button, buttonClasses } from "./Button";

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

// Review #135: Button renders the same classes as before buttonClasses existed (only their order changed, which
// does not change the CSS). This is the class list of Button on staging before the change, per variant and size.
describe("Button classes before and after buttonClasses", () => {
  const BEFORE_BASE =
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-control font-sans leading-none transition-colors cursor-pointer disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-ink";
  const BEFORE_VARIANT = {
    primary: "border-0 bg-ink text-paper hover:bg-ink-hover",
    accent: "border-0 bg-accent text-paper hover:bg-accent-hover",
    ghost: "border border-line bg-paper text-ink hover:bg-surface disabled:border-transparent",
    danger: "border-0 bg-danger text-paper hover:bg-danger-strong",
  } as const;
  const BEFORE_SIZE = { md: "h-9 px-3.5 text-sm", sm: "h-8 px-3 text-[13px]" } as const;
  const cases = (["primary", "accent", "ghost", "danger"] as const).flatMap((variant) =>
    (["md", "sm"] as const).map((size) => [variant, size] as const),
  );

  // Positif: every variant and size keeps exactly its classes.
  it.each(cases)("keeps the %s %s classes", (variant, size) => {
    render(
      <Button variant={variant} size={size}>
        Aksi
      </Button>,
    );
    const expected = `${BEFORE_BASE} ${BEFORE_VARIANT[variant]} ${BEFORE_SIZE[size]}`.split(" ").sort();

    expect(screen.getByRole("button", { name: "Aksi" }).className.split(" ").sort()).toEqual(expected);
  });
});

// Review #135 (PBI-25 one look): links that look like a Button share its classes instead of copying them.
describe("buttonClasses", () => {
  // Positif: Button is built from the same classes, so a change to the look reaches every button-looking link.
  it("gives a link exactly the classes of the Button with the same variant and size", () => {
    render(
      <Button variant="ghost" size="sm">
        Aksi
      </Button>,
    );

    expect(screen.getByRole("button", { name: "Aksi" }).className).toBe(buttonClasses({ variant: "ghost", size: "sm" }));
  });

  // Positif: the ghost look of the shared table pager, regular weight and the surface hover.
  it("uses the ghost look with the surface hover and no bold text", () => {
    const classes = buttonClasses({ variant: "ghost" }).split(" ");

    expect(classes).toEqual(expect.arrayContaining(["border-line", "bg-paper", "hover:bg-surface", "h-9"]));
    expect(classes.some((name) => name.startsWith("font-") && name !== "font-sans")).toBe(false);
  });

  // Positif: a link with nowhere to go gets the same filled grey as a disabled Button, without any hover.
  it.each(["primary", "accent", "ghost", "danger"] as const)("turns the %s look off like a disabled Button", (variant) => {
    const classes = buttonClasses({ variant, disabled: true }).split(" ");

    expect(classes).toEqual(expect.arrayContaining(["bg-disabled-bg", "text-disabled-ink", "cursor-not-allowed"]));
    expect(classes.some((name) => name.startsWith("hover:") || name === "cursor-pointer")).toBe(false);
  });

  // Edge: long content such as a 64-character case code may wrap; a fixed height or nowrap would cut it.
  it("lets multiline content wrap with a minimum height instead of a fixed one", () => {
    const classes = buttonClasses({ variant: "ghost", size: "sm", multiline: true }).split(" ");

    expect(classes).toEqual(expect.arrayContaining(["min-h-8", "flex-wrap"]));
    expect(classes).not.toContain("h-8");
    expect(classes).not.toContain("whitespace-nowrap");
  });

  // Edge: no two classes set the same property, so the result never depends on the order of the generated CSS.
  it.each([
    [{}],
    [{ variant: "ghost", multiline: true }],
    [{ variant: "ghost", disabled: true, multiline: true }],
    [{ variant: "danger", size: "sm", disabled: true }],
  ] as const)("has no conflicting classes for %o", (look) => {
    const classes = buttonClasses(look).split(" ");
    const plain = classes.filter((name) => !name.includes(":"));

    expect(new Set(classes).size).toBe(classes.length);
    expect(plain.filter((name) => /^(h|min-h)-/.test(name))).toHaveLength(1);
    expect(plain.filter((name) => /^bg-/.test(name))).toHaveLength(1);
    expect(plain.filter((name) => /^leading-/.test(name))).toHaveLength(1);
  });
});
