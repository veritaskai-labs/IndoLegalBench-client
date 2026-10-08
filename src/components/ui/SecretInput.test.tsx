import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { CredentialHint } from "./CredentialHint";
import { SecretInput } from "./SecretInput";

function Controlled({ hint, error }: { hint?: string; error?: string }) {
  const [value, setValue] = useState("");
  return <SecretInput label="Kredensial" value={value} onChange={setValue} hint={hint} error={error} />;
}

describe("SecretInput", () => {
  // Positive
  it("hides what is typed by default and shows it on request", async () => {
    const user = userEvent.setup();
    render(<Controlled />);
    const input = screen.getByLabelText("Kredensial");

    await user.type(input, "sk-rahasia-1234");

    expect(input).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Tampilkan kredensial" }));
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveValue("sk-rahasia-1234");

    await user.click(screen.getByRole("button", { name: "Sembunyikan kredensial" }));
    expect(input).toHaveAttribute("type", "password");
  });

  // Negative: nothing to reveal while empty.
  it("disables the toggle while the field is empty", () => {
    render(<Controlled />);

    expect(screen.getByRole("button", { name: "Tampilkan kredensial" })).toBeDisabled();
  });

  // Corner: the browser must not autofill a saved password into it.
  it("asks the browser not to autofill and not to spellcheck", () => {
    render(<Controlled />);
    const input = screen.getByLabelText("Kredensial");

    expect(input).toHaveAttribute("autocomplete", "new-password");
    expect(input).toHaveAttribute("spellcheck", "false");
  });

  it("announces the error first, then the hint", () => {
    render(<Controlled hint="Kredensial tersimpan" error="Kredensial wajib diisi." />);
    const input = screen.getByLabelText("Kredensial");

    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Kredensial wajib diisi. Kredensial tersimpan");
  });
});

describe("CredentialHint", () => {
  it("shows only the last four characters and reads them without the dots", () => {
    render(<CredentialHint hint="a1b2" />);

    expect(screen.getByText("••••a1b2")).toBeInTheDocument();
    expect(screen.getByLabelText("Kredensial berakhiran a1b2")).toBeInTheDocument();
  });
});
