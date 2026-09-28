import { useId } from "react";
import {
  useFieldArray,
  type Control,
  type UseFormRegister,
} from "react-hook-form";
import {
  emptyLegalRef,
  emptyTrap,
  type CaseFormValues,
} from "@/lib/cases/caseFormMapping";
import {
  AddRowButton,
  FormSection,
  RowGroup,
  TextAreaField,
  TextField,
} from "./fields";

type RegisterProps = { register: UseFormRegister<CaseFormValues> };
type ArrayProps = RegisterProps & { control: Control<CaseFormValues> };

export function IdentitySection({ register }: RegisterProps) {
  return (
    <FormSection title="Identitas">
      <TextField label="ID kasus" registration={register("case_code")} />
      <TextField label="Judul" registration={register("identity.title")} />
      <TextField label="Kategori" registration={register("identity.category")} />
      <TextAreaField
        label="Pertanyaan"
        rows={4}
        registration={register("identity.question")}
      />
    </FormSection>
  );
}

export function LegalRefsSection({ register, control }: ArrayProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "legal_refs" });
  return (
    <FormSection title="Rujukan hukum">
      {fields.map((field, index) => (
        <RowGroup
          key={field.id}
          title={`Rujukan ${index + 1}`}
          removeLabel={`Hapus rujukan ${index + 1}`}
          onRemove={() => remove(index)}
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <TextField
              label="Jenis peraturan"
              registration={register(`legal_refs.${index}.regulation_type`)}
            />
            <TextField
              label="Nomor"
              registration={register(`legal_refs.${index}.regulation_number`)}
            />
            <TextField
              label="Tahun"
              type="number"
              registration={register(`legal_refs.${index}.year`)}
            />
            <TextField label="Pasal" registration={register(`legal_refs.${index}.pasal`)} />
            <TextField label="Ayat" registration={register(`legal_refs.${index}.ayat`)} />
            <TextField label="Huruf" registration={register(`legal_refs.${index}.huruf`)} />
          </div>
        </RowGroup>
      ))}
      <AddRowButton label="+ Tambah rujukan" onClick={() => append(emptyLegalRef())} />
    </FormSection>
  );
}

export function AnswerCriteriaSection({ register }: RegisterProps) {
  return (
    <FormSection title="Kriteria jawaban">
      <p className="text-xs text-slate-500">Satu frasa per baris.</p>
      <TextAreaField
        label="Wajib ada"
        registration={register("answer_criteria.must_contain")}
      />
      <TextAreaField
        label="Tidak boleh ada"
        registration={register("answer_criteria.must_not_contain")}
      />
      <TextAreaField
        label="Kesimpulan yang diharapkan"
        registration={register("answer_criteria.expected_conclusion")}
      />
    </FormSection>
  );
}

export function TrapsSection({ register, control }: ArrayProps) {
  const { fields, append, remove } = useFieldArray({ control, name: "traps" });
  return (
    <FormSection title="Jebakan">
      {fields.map((field, index) => (
        <RowGroup
          key={field.id}
          title={`Jebakan ${index + 1}`}
          removeLabel={`Hapus jebakan ${index + 1}`}
          onRemove={() => remove(index)}
        >
          <TextAreaField
            label="Deskripsi"
            registration={register(`traps.${index}.description`)}
          />
          <TextAreaField
            label="Perilaku model yang diharapkan"
            registration={register(`traps.${index}.expected_model_behavior`)}
          />
        </RowGroup>
      ))}
      <AddRowButton label="+ Tambah jebakan" onClick={() => append(emptyTrap())} />
    </FormSection>
  );
}

const SPLIT_TAGS = [
  {
    value: "dev",
    hint: "Untuk pengembangan: boleh dipakai saat menyusun dan menyetel produk.",
  },
  {
    value: "test",
    hint: "Untuk pengujian akhir: disimpan terpisah untuk mengukur hasil.",
  },
] as const;

export function SplitTagSection({ register }: RegisterProps) {
  const baseId = useId();
  return (
    <FormSection title="Tag dev/test">
      {SPLIT_TAGS.map(({ value, hint }) => {
        const id = `${baseId}-${value}`;
        return (
          <div key={value} className="flex items-start gap-2">
            <input
              id={id}
              type="radio"
              value={value}
              aria-describedby={`${id}-hint`}
              {...register("split_tag")}
              className="mt-1"
            />
            <div>
              <label htmlFor={id} className="text-sm font-medium text-slate-700">
                {value}
              </label>
              <p id={`${id}-hint`} className="text-xs text-slate-500">
                {hint}
              </p>
            </div>
          </div>
        );
      })}
    </FormSection>
  );
}
