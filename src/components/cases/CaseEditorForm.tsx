"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { get, useForm } from "react-hook-form";
import { useLegalRefPreview } from "@/hooks/useLegalRefPreview";
import { useRegulationTypes } from "@/hooks/useRegulationTypes";
import {
  emptyCaseFormValues,
  toCaseWritePayload,
  type CaseFormValues,
  type CaseWritePayload,
} from "@/lib/cases/caseFormMapping";
import { caseFormResolver, flattenErrors } from "@/lib/cases/caseValidation";
import { fieldErrorText, type FieldSaveError } from "@/lib/cases/saveError";
import type { SplitTag } from "@/types/case";
import { EditorActionBar } from "./EditorActionBar";
import { ErrorSummary } from "./ErrorSummary";
import { LegalRefsSection } from "./LegalRefsSection";
import {
  AnswerCriteriaSection,
  IdentitySection,
  SplitTagSection,
  type ErrorLookup,
} from "./sections";

type Props = {
  /** Tanpa nilai berarti kasus baru. */
  defaultValues?: CaseFormValues;
  /** Kasus yang sedang diedit, untuk pratinjau rujukan (SCRUM-162). Tanpa nilai untuk kasus baru. */
  caseId?: string;
  /**
   * Page yang memutuskan POST atau PUT; form hanya menyerahkan payload.
   * Bila server menolak satu field, page mengembalikan error itu agar form menempelkannya.
   */
  onSubmit: (payload: CaseWritePayload) => void | Promise<FieldSaveError | null | void>;
  /** Dipanggil saat form berubah dari bersih ke berisi perubahan, atau sebaliknya. */
  onDirtyChange?: (dirty: boolean) => void;
  /** Versi terkunci: semua kolom dinonaktifkan dan tombol simpan disembunyikan. */
  readOnly?: boolean;
  /** Aksi di samping Simpan draf, dalam bar yang menempel di bawah layar. Hilang bila readOnly. */
  actions?: ReactNode;
  /**
   * Kasus sudah pernah disetujui: tag hanya diubah Admin lewat dialog "Ubah tag" (PBI-9 AC3).
   * Pilihan tag diganti badge; nilainya tetap ikut terkirim dari defaultValues.
   */
  tagLocked?: boolean;
};

/** Tag tersimpan, atau null bila belum dipilih (nilai form kosong ""). */
function chosenTag(values: CaseFormValues | undefined): SplitTag | null {
  const tag = values?.split_tag;
  return tag === "dev" || tag === "test" ? tag : null;
}

/** Jeda validasi saat mengetik, supaya error tidak berkedip di tiap ketukan. */
export const VALIDATE_DELAY_MS = 300;

const FORM_SECTIONS = [
  { id: "section-identitas", label: "Identitas" },
  { id: "section-rujukan-hukum", label: "Rujukan hukum" },
  { id: "section-kriteria-jawaban", label: "Kriteria jawaban" },
  { id: "section-tag-dev-test", label: "Tag dev/test" },
] as const;

type SectionId = (typeof FORM_SECTIONS)[number]["id"];

const SECTION_TOP_THRESHOLD_PX = 160;

export function CaseEditorForm({
  defaultValues,
  caseId,
  onSubmit,
  onDirtyChange,
  readOnly = false,
  actions,
  tagLocked = false,
}: Readonly<Props>) {
  const {
    register,
    control,
    handleSubmit,
    formState,
    getFieldState,
    setError,
    clearErrors,
    setFocus,
    subscribe,
    trigger,
  } = useForm<CaseFormValues>({
    defaultValues: defaultValues ?? emptyCaseFormValues(),
    // Aturan dari contract (gen:zod). Kriteria jawaban tidak wajib, jadi draf tetap bisa disimpan.
    resolver: caseFormResolver,
    mode: "onBlur",
    reValidateMode: "onBlur",
  });

  // Validasi saat mengetik, hanya untuk field yang berubah, setelah jeda singkat.
  // Timer disimpan di ref supaya submit bisa membatalkannya.
  const validateTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    const unsubscribe = subscribe({
      formState: { values: true },
      callback: ({ name, type }) => {
        // Hanya ketikan pengguna. Tambah baris kosong tidak boleh langsung memunculkan error.
        if (name === undefined || type !== "change") return;
        clearTimeout(validateTimer.current);
        validateTimer.current = setTimeout(
          () => void trigger(name as Parameters<typeof trigger>[0]),
          VALIDATE_DELAY_MS,
        );
      },
    });
    return () => {
      clearTimeout(validateTimer.current);
      unsubscribe();
    };
  }, [subscribe, trigger]);

  // Satu kali untuk seluruh bagian rujukan, bukan di tiap baris.
  const regulationTypes = useRegulationTypes();
  // Pratinjau dan error rujukan dari server saat mengetik; versi terkunci tidak perlu.
  const preview = useLegalRefPreview(control, caseId ?? null, !readOnly);

  const { isDirty } = formState;
  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  const errorFor: ErrorLookup = (path) => getFieldState(path, formState).error?.message;
  const rowHasError = (row: string) => get(formState.errors, row) !== undefined;
  const sectionProps = { register, errorFor };
  // Ringkasan ikut tampil begitu ada error, sebelum Simpan ditekan (UAT TC_29).
  const summary = flattenErrors(formState.errors);

  const submit = handleSubmit(async (values) => {
    const fieldError = await onSubmit(toCaseWritePayload(values));
    if (fieldError) {
      setError(
        fieldError.path,
        { type: "server", message: fieldErrorText(fieldError) },
        { shouldFocus: true },
      );
    }
  });

  const [activeSection, setActiveSection] = useState<SectionId>("section-identitas");

  useEffect(() => {
    function updateActiveSection() {
      let current: SectionId = FORM_SECTIONS[0].id;
      for (const section of FORM_SECTIONS) {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top <= SECTION_TOP_THRESHOLD_PX) {
          current = section.id;
        }
      }
      setActiveSection(current);
    }

    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveSection);
  }, []);

  function jumpToSection(id: SectionId) {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_200px] lg:items-start lg:gap-8">
      <form
        noValidate
        onSubmit={(event) => {
          // Submit memvalidasi seluruh form. Validasi tertunda yang menyala sesudahnya
          // akan menghapus error dari server untuk field itu (SCRUM-131).
          clearTimeout(validateTimer.current);
          // Error server lama berlaku untuk simpan sebelumnya; server menilai ulang tiap simpan.
          clearErrors();
          return submit(event);
        }}
        className="space-y-6"
      >
        <ErrorSummary issues={summary} onSelect={(path) => setFocus(path)} />
        {/* fieldset disabled menonaktifkan semua kolom dan tombol tambah baris di dalamnya sekaligus. */}
        <fieldset disabled={readOnly} className="m-0 min-w-0 space-y-6 border-0 p-0">
          <IdentitySection {...sectionProps} />
          <LegalRefsSection
            {...sectionProps}
            control={control}
            rowHasError={rowHasError}
            regulationTypes={regulationTypes}
            preview={preview}
          />
          <AnswerCriteriaSection {...sectionProps} />
          <SplitTagSection {...sectionProps} lockedTag={tagLocked ? chosenTag(defaultValues) : null} />
        </fieldset>

        {!readOnly && <EditorActionBar saving={formState.isSubmitting}>{actions}</EditorActionBar>}
      </form>

      <nav
        aria-label="Navigasi bagian kasus"
        className="sticky top-20 hidden space-y-1 lg:block"
      >
        {FORM_SECTIONS.map(({ id, label }) => {
          const isActive = activeSection === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => jumpToSection(id)}
              aria-current={isActive ? "location" : undefined}
              className={`block w-full cursor-pointer py-1.5 text-left text-sm transition-colors ${
                isActive ? "font-semibold text-ink" : "text-ink-soft hover:text-ink"
              }`}
            >
              {label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
