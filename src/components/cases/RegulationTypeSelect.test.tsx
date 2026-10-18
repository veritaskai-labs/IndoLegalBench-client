import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { RegulationType } from "@/types/regulationType";
import { MAX_VISIBLE_OPTIONS, RegulationTypeSelect } from "./RegulationTypeSelect";

function regulationType(
  code: string,
  label: string,
  singkatan: string | null = null,
): RegulationType {
  return { code, label, singkatan, is_active: true };
}

const TYPES: RegulationType[] = [
  regulationType("uu", "Undang-undang", "UU"),
  regulationType("pp", "Peraturan Pemerintah", "PP"),
  regulationType("permen", "Peraturan Kementerian", "Permen"),
  regulationType("peraturan_menteri_keuangan", "Peraturan Menteri Keuangan"),
  regulationType("keputusan_menteri_keuangan", "Keputusan Menteri Keuangan"),
];

type HarnessProps = {
  initial?: string;
  types?: readonly RegulationType[];
  onChange?: (code: string) => void;
  onBlur?: () => void;
  error?: string;
  hint?: string;
  disabled?: boolean;
};

/** Komponen ini terkendali: pembungkus ini menyimpan nilainya seperti yang dilakukan form. */
function Harness({
  initial = "",
  types = TYPES,
  onChange = vi.fn(),
  ...rest
}: Readonly<HarnessProps>) {
  const [value, setValue] = useState(initial);
  return (
    <RegulationTypeSelect
      label="Jenis peraturan"
      types={types}
      value={value}
      onChange={(code) => {
        setValue(code);
        onChange(code);
      }}
      {...rest}
    />
  );
}

const combobox = () => screen.getByRole("combobox", { name: "Jenis peraturan" });
const options = () => screen.queryAllByRole("option");
const optionNames = () => options().map((option) => option.textContent ?? "");

function manyTypes(count: number): RegulationType[] {
  return Array.from({ length: count }, (_, i) =>
    regulationType(`jenis_${i + 1}`, `Jenis ${i + 1}`),
  );
}

describe("RegulationTypeSelect", () => {
  // Positive
  it("is a closed combobox named by its label", () => {
    // Arrange
    render(<Harness />);

    // Act
    const input = combobox();

    // Assert
    expect(input).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows the label of the selected type in the input", () => {
    // Arrange + Act
    render(<Harness initial="uu" />);

    // Assert
    expect(combobox()).toHaveValue("Undang-undang");
  });

  it("opens the list when the input is clicked and lists every type", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Harness />);

    // Act
    await user.click(combobox());

    // Assert
    expect(combobox()).toHaveAttribute("aria-expanded", "true");
    expect(options()).toHaveLength(TYPES.length);
  });

  it("narrows the list to the types that match what is typed", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Harness />);

    // Act
    await user.type(combobox(), "menteri keuangan");

    // Assert
    expect(optionNames()).toEqual(["Peraturan Menteri Keuangan", "Keputusan Menteri Keuangan"]);
  });

  it("shows the abbreviation next to the label of an option", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Harness />);

    // Act
    await user.type(combobox(), "undang");

    // Assert
    const option = screen.getByRole("option");
    expect(within(option).getByText("Undang-undang")).toBeInTheDocument();
    expect(within(option).getByText("UU")).toBeInTheDocument();
  });

  it("selects the clicked option, closes the list and shows its label", async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.type(combobox(), "pemerintah");

    // Act
    await user.click(screen.getByRole("option", { name: /Peraturan Pemerintah/ }));

    // Assert
    expect(onChange).toHaveBeenCalledExactlyOnceWith("pp");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(combobox()).toHaveValue("Peraturan Pemerintah");
  });

  it("marks only the selected type as selected in the list", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Harness initial="pp" />);

    // Act
    await user.click(combobox());

    // Assert
    const selected = options().filter((option) => option.getAttribute("aria-selected") === "true");
    expect(selected.map((option) => option.textContent)).toEqual([
      expect.stringContaining("Peraturan Pemerintah"),
    ]);
  });

  // Keyboard
  it("moves through the options with the arrow keys and picks one with Enter", async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.type(combobox(), "peraturan");

    // Act
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");

    // Assert: the second match for "peraturan" in the server order is Permen
    expect(onChange).toHaveBeenCalledExactlyOnceWith("permen");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("points aria-activedescendant at the highlighted option", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(combobox());

    // Act
    await user.keyboard("{ArrowDown}");

    // Assert
    const [first] = options();
    expect(first).toHaveAttribute("id");
    expect(combobox()).toHaveAttribute("aria-activedescendant", first?.getAttribute("id"));
  });

  it("opens the list with the arrow key when it is closed", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Harness />);
    combobox().focus();

    // Act
    await user.keyboard("{ArrowDown}");

    // Assert
    expect(combobox()).toHaveAttribute("aria-expanded", "true");
  });

  it("wraps from the last option to the first, and from the first back to the last", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(combobox());

    // Act
    await user.keyboard("{ArrowUp}");
    const afterUp = combobox().getAttribute("aria-activedescendant");
    await user.keyboard("{ArrowDown}");
    const afterDown = combobox().getAttribute("aria-activedescendant");

    // Assert
    expect(afterUp).toBe(options().at(-1)?.getAttribute("id"));
    expect(afterDown).toBe(options()[0]?.getAttribute("id"));
  });

  it("selects nothing when Enter is pressed with no highlighted option", async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    await user.type(combobox(), "menteri");

    // Act
    await user.keyboard("{Enter}");

    // Assert
    expect(onChange).not.toHaveBeenCalled();
  });

  it("closes on Escape and keeps the chosen type", async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial="uu" onChange={onChange} />);
    await user.click(combobox());
    await user.keyboard("{Control>}a{/Control}pemerintah");

    // Act
    await user.keyboard("{Escape}");

    // Assert
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
    expect(combobox()).toHaveValue("Undang-undang");
    expect(onChange).not.toHaveBeenCalled();
  });

  // Edge cases
  it("does not call onChange while the user is only typing", async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    // Act
    await user.type(combobox(), "peraturan");

    // Assert
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows at most the visible limit and says how many more there are", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Harness types={manyTypes(MAX_VISIBLE_OPTIONS + 70)} />);

    // Act
    await user.click(combobox());

    // Assert
    expect(options()).toHaveLength(MAX_VISIBLE_OPTIONS);
    expect(screen.getByRole("status")).toHaveTextContent(
      `Menampilkan ${MAX_VISIBLE_OPTIONS} dari ${MAX_VISIBLE_OPTIONS + 70} jenis. Ketik untuk mempersempit.`,
    );
  });

  it("does not show the limit note when everything fits", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Harness />);

    // Act
    await user.click(combobox());

    // Assert
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("says so when nothing matches", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Harness />);

    // Act
    await user.type(combobox(), "tidak ada jenis ini");

    // Assert
    expect(options()).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent("Jenis peraturan tidak ditemukan.");
  });

  it("says so when the server has no type at all", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Harness types={[]} />);

    // Act
    await user.click(combobox());

    // Assert
    expect(screen.getByRole("status")).toHaveTextContent(
      "Belum ada jenis peraturan yang tersedia.",
    );
  });

  it("shows the code of a saved type that is no longer in the list", () => {
    // Arrange + Act
    render(<Harness initial="peraturan_lama" />);

    // Assert
    expect(combobox()).toHaveValue("peraturan_lama");
  });

  it("shows the label, not the code, of a saved type that was deactivated", () => {
    // Arrange
    const types = [
      ...TYPES,
      { ...regulationType("permen_lama", "Peraturan Lama"), is_active: false },
    ];

    // Act
    render(<Harness types={types} initial="permen_lama" />);

    // Assert
    expect(combobox()).toHaveValue("Peraturan Lama");
  });

  it("does not offer a deactivated type as an option", async () => {
    // Arrange
    const user = userEvent.setup();
    const types = [
      ...TYPES,
      { ...regulationType("permen_lama", "Peraturan Lama"), is_active: false },
    ];
    render(<Harness types={types} />);

    // Act
    await user.click(combobox());

    // Assert
    expect(optionNames()).toHaveLength(TYPES.length);
    expect(optionNames().join(" ")).not.toContain("Peraturan Lama");
  });

  it("does not find a deactivated type when searching", async () => {
    // Arrange
    const user = userEvent.setup();
    const types = [
      ...TYPES,
      { ...regulationType("permen_lama", "Peraturan Lama"), is_active: false },
    ];
    render(<Harness types={types} />);

    // Act
    await user.type(combobox(), "Peraturan Lama");

    // Assert
    expect(options()).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent("Jenis peraturan tidak ditemukan.");
  });

  it("says no type is available when every type is deactivated", async () => {
    // Arrange
    const user = userEvent.setup();
    const types = TYPES.map((type) => ({ ...type, is_active: false }));
    render(<Harness types={types} />);

    // Act
    await user.click(combobox());

    // Assert
    expect(options()).toHaveLength(0);
    expect(screen.getByRole("status")).toHaveTextContent(
      "Belum ada jenis peraturan yang tersedia.",
    );
  });

  it("puts the chosen label back when the user leaves without choosing", async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial="uu" onChange={onChange} />);
    await user.click(combobox());
    await user.keyboard("{Control>}a{/Control}pemerintah");

    // Act
    await user.tab();

    // Assert
    expect(combobox()).toHaveValue("Undang-undang");
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("clears the choice when the user empties the input and leaves", async () => {
    // Arrange
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness initial="uu" onChange={onChange} />);
    await user.click(combobox());
    await user.keyboard("{Control>}a{/Control}{Backspace}");

    // Act
    await user.tab();

    // Assert
    expect(onChange).toHaveBeenCalledExactlyOnceWith("");
    expect(combobox()).toHaveValue("");
  });

  it("calls onBlur when the user leaves", async () => {
    // Arrange
    const user = userEvent.setup();
    const onBlur = vi.fn();
    render(<Harness onBlur={onBlur} />);
    await user.click(combobox());

    // Act
    await user.tab();

    // Assert
    expect(onBlur).toHaveBeenCalledTimes(1);
  });

  // Accessibility and states
  it("ties aria-controls to the open list", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Harness />);

    // Act
    await user.click(combobox());

    // Assert
    expect(combobox()).toHaveAttribute("aria-controls", screen.getByRole("listbox").id);
  });

  it("does not open and cannot be typed in when disabled", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<Harness disabled />);

    // Act
    await user.click(combobox());

    // Assert
    expect(combobox()).toBeDisabled();
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("shows the hint and ties it to the input", () => {
    // Arrange + Act
    render(<Harness hint="Pilih jenis yang spesifik kalau ada." />);

    // Assert
    expect(combobox()).toHaveAccessibleDescription("Pilih jenis yang spesifik kalau ada.");
  });

  it("marks the input invalid and ties the error to it", () => {
    // Arrange + Act
    render(<Harness error="Jenis peraturan wajib dipilih." />);

    // Assert
    expect(combobox()).toHaveAttribute("aria-invalid", "true");
    expect(combobox()).toHaveAccessibleDescription("Jenis peraturan wajib dipilih.");
  });

  it("has no description when there is no hint and no error", () => {
    // Arrange + Act
    render(<Harness />);

    // Assert
    expect(combobox()).not.toHaveAttribute("aria-describedby");
    expect(combobox()).not.toHaveAttribute("aria-invalid");
  });
});

describe("RegulationTypeSelect input ref", () => {
  // Positive: the form focuses the field by name when its error is picked in the summary.
  it("hands the input element to the ref it is given", () => {
    // Arrange
    const ref = createRef<HTMLInputElement>();

    // Act
    render(
      <RegulationTypeSelect
        label="Jenis peraturan"
        types={TYPES}
        value=""
        onChange={vi.fn()}
        inputRef={ref}
      />,
    );

    // Assert
    expect(ref.current).toBe(screen.getByRole("combobox", { name: "Jenis peraturan" }));
  });

  it("accepts a callback ref too", () => {
    // Arrange
    const received: (HTMLInputElement | null)[] = [];

    // Act
    render(
      <RegulationTypeSelect
        label="Jenis peraturan"
        types={TYPES}
        value=""
        onChange={vi.fn()}
        inputRef={(element) => {
          received.push(element);
        }}
      />,
    );

    // Assert
    expect(received[0]).toBe(screen.getByRole("combobox", { name: "Jenis peraturan" }));
  });
});
