import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { describe, expect, it, vi } from "vitest";
import { emptyCaseFormValues, type CaseFormValues } from "@/lib/cases/caseFormMapping";
import { emptyLegalRef } from "@/lib/cases/legalRefForm";
import { LegalRefRow } from "./LegalRefRow";

const READY_TYPES = {
  status: "ready" as const,
  types: [{ code: "uu", label: "Undang-undang", singkatan: "UU", is_active: true }],
  reload: vi.fn(),
};

/** Form kecil dengan satu rujukan; `index` menentukan baris mana yang ditampilkan. */
function Host({ index }: Readonly<{ index: number }>) {
  const { register, control } = useForm<CaseFormValues>({
    defaultValues: { ...emptyCaseFormValues(), legal_refs: [emptyLegalRef()] },
  });
  return (
    <LegalRefRow
      index={index}
      control={control}
      register={register}
      errorFor={() => undefined}
      invalid={false}
      regulationTypes={READY_TYPES}
      onUpdate={vi.fn()}
      onRemove={vi.fn()}
    />
  );
}

describe("LegalRefRow", () => {
  // Positive
  it("shows the group of the reference at its index", () => {
    // Arrange + Act
    render(<Host index={0} />);

    // Assert
    expect(screen.getByRole("combobox", { name: "Bentuk rujukan" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hapus rujukan 1" })).toBeInTheDocument();
  });

  // Edge: right after a removal the list shrinks one render later than the row is asked for.
  it("renders nothing when there is no reference at its index", () => {
    // Arrange + Act
    const { container } = render(<Host index={3} />);

    // Assert
    expect(container).toBeEmptyDOMElement();
  });
});
