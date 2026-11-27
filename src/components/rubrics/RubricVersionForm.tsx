"use client";

import { useRef, useState } from "react";

import { Breadcrumb, Button, ConfirmDialog, Icon } from "@/components/ui";
import { useCreateRubricVersion } from "@/hooks/useCreateRubricVersion";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { createEmptyDraft, createRubricV1Draft } from "@/lib/rubrics/rubricDraft";
import { addAspect, removeAspect, setDescriptor, setField, updateAspect, updateLevel } from "@/lib/rubrics/rubricDraftEdit";
import {
  type FormSection,
  formSections,
  isDraftEmpty,
  problemSummary,
  requiredProblems,
  saveSummaryRows,
  SECTION_INFO,
  SECTION_PROMPT,
  SECTION_SCALE,
} from "@/lib/rubrics/rubricFormCheck";
import { RUBRIC_HELP, RUBRIC_PLACEHOLDER } from "@/lib/rubrics/rubricHelpText";
import { httpRubricsGateway, type RubricsGateway } from "@/lib/rubrics/rubricsApi";
import type { RubricVersion } from "@/types/rubric";
import { AspectEditor } from "./AspectEditor";
import { FormCard } from "./FormCard";
import { LevelsEditor } from "./LevelsEditor";
import { RubricField } from "./RubricField";

type Dialog = "save" | "template" | "cancel";

/** Teks status bagian untuk pembaca layar; tampilannya ikon dan angka. */
function sectionStatus(section: FormSection, showProblems: boolean): string {
  if (section.complete) return ", lengkap";
  return showProblems ? `, ${section.problems} isian kosong` : ", belum lengkap";
}

/**
 * Navigasi bagian (B1, B7): kolom kanan yang menempel di desktop, chip yang menempel di bawah judul di
 * ponsel. Centang hijau bila semua isian wajib bagian itu terisi; setelah Simpan ditolak (B5), bagian
 * yang belum lengkap merah dengan jumlah isian kosongnya.
 */
function SectionNav({
  sections,
  showProblems,
  current,
  onPick,
}: Readonly<{ sections: FormSection[]; showProblems: boolean; current: string; onPick: (id: string) => void }>) {
  return (
    <nav
      aria-label="Bagian formulir"
      className="sticky top-14 z-10 -mx-4 min-w-0 bg-paper px-4 py-2 lg:top-24 lg:order-2 lg:mx-0 lg:self-start lg:p-0"
    >
      <ul className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible">
        {sections.map((section) => {
          const flagged = showProblems && !section.complete;
          let icon = <Icon name="lingkaran" size={14} className="text-subtle" />;
          if (section.complete) icon = <Icon name="centang" size={14} className="text-success-ink" />;
          else if (flagged) icon = <Icon name="peringatan" size={14} className="text-danger" />;
          return (
            <li key={section.id} className="shrink-0">
              <a
                href={`#${section.id}`}
                aria-current={current === section.id ? "true" : undefined}
                onClick={() => onPick(section.id)}
                className={`relative flex h-9 items-center gap-2 whitespace-nowrap rounded-control border border-line px-3 text-[13px] hover:bg-surface aria-[current=true]:bg-surface aria-[current=true]:font-medium lg:h-8 lg:border-0 ${flagged ? "text-danger" : "text-ink"}`}
              >
                {icon}
                <span>{section.title}</span>
                {flagged && <span aria-hidden="true">{`· ${section.problems}`}</span>}
                <span className="sr-only">{sectionStatus(section, showProblems)}</span>
              </a>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 hidden px-3 text-xs leading-4 text-muted lg:block">
        Tanda centang muncul bila semua isian wajib (*) di bagian itu sudah terisi.
      </p>
    </nav>
  );
}

/**
 * Form membuat versi baru rubrik (PBI-14 AC7), tata letak SCRUM-375 B. Pemeriksaan di browser hanya
 * "isian wajib tidak kosong" (B5, lewat rubricFormCheck); aturan antar-isian tetap di server dan pesan
 * 422-nya ditaruh di samping isian yang disebut server. Simpan membuka ringkasan dulu (B4) karena versi
 * tidak bisa diubah setelah disimpan. Isi permintaan ke server tidak berubah (AC8).
 */
export function RubricVersionForm({
  gateway = httpRubricsGateway,
  nextVersionNo,
  onCreated,
  onCancel,
}: Readonly<{
  gateway?: RubricsGateway;
  /** Nomor yang akan didapat versi ini; null bila daftar versi belum termuat. */
  nextVersionNo: number | null;
  onCreated: (version: RubricVersion) => void;
  onCancel: () => void;
}>) {
  const formRef = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(createEmptyDraft);
  const [showProblems, setShowProblems] = useState(false);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [currentSection, setCurrentSection] = useState(SECTION_INFO);
  const { submit, pending, error, fieldError } = useCreateRubricVersion(onCreated, gateway);

  const empty = isDraftEmpty(draft);
  useUnsavedChangesWarning(!empty);

  const problems = requiredProblems(draft);
  const sections = formSections(draft);
  const flagged = showProblems && problems.length > 0;
  const versionName = nextVersionNo === null ? null : `Versi ${nextVersionNo}`;

  // Pesan isian wajib dihitung ulang tiap render, jadi hilang begitu isiannya diisi.
  const errorFor = (path: string) => {
    const missing = showProblems ? problems.find((problem) => problem.path === path) : undefined;
    if (missing) return missing.message;
    return fieldError?.field === path ? fieldError.message : null;
  };

  function focusFirstProblem() {
    const first = problems[0];
    if (first) formRef.current?.querySelector<HTMLElement>(`[data-path="${first.path}"]`)?.focus();
  }

  function save() {
    if (problems.length > 0) {
      setShowProblems(true);
      focusFirstProblem();
      return;
    }
    setDialog("save");
  }

  function fillTemplate() {
    if (empty) setDraft(createRubricV1Draft());
    else setDialog("template");
  }

  function cancel() {
    if (empty) onCancel();
    else setDialog("cancel");
  }

  const closeDialog = () => setDialog(null);
  const noFailure = () => "";

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        save();
      }}
      className="space-y-6"
    >
      {/* Jejak lewat onClick, bukan href: kembali ke daftar juga menanyakan dulu bila form berisi (B6). */}
      <Breadcrumb items={[{ label: "Rubrik penilaian", onClick: cancel }, { label: "Buat versi baru" }]} />
      <header className="-mt-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl leading-10 text-ink sm:text-4xl">Buat versi baru</h1>
          {versionName && <p className="text-sm text-muted">{`Akan disimpan sebagai ${versionName}.`}</p>}
        </div>
        <Button variant="ghost" onClick={fillTemplate} className="h-11 sm:h-9">
          Isi dari template rubrik v1
        </Button>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-6">
        <SectionNav sections={sections} showProblems={showProblems} current={currentSection} onPick={setCurrentSection} />

        <div className="min-w-0 space-y-6 lg:order-1">
          {flagged && (
            <p role="alert" className="flex items-start gap-2 rounded-control border border-danger/30 bg-danger-wash px-4 py-3 text-[13px] text-danger-strong">
              <Icon name="silang" size={14} className="mt-[3px]" />
              <span>{problemSummary(sections)}</span>
            </p>
          )}

          <FormCard id={SECTION_INFO} title="Informasi versi">
            <div className="grid gap-4 sm:grid-cols-3">
              <RubricField label="Berlaku sejak" type="date" required path="effective_date" hint={RUBRIC_HELP.effectiveDate} value={draft.effectiveDate} onChange={(v) => setDraft(setField(draft, "effectiveDate", v))} error={errorFor("effective_date")} />
              <RubricField label="Nama penyetuju" path="approved_by_name" hint={RUBRIC_HELP.approvedByName} placeholder={RUBRIC_PLACEHOLDER.approvedByName} value={draft.approvedByName} onChange={(v) => setDraft(setField(draft, "approvedByName", v))} error={errorFor("approved_by_name")} />
              <RubricField label="Tanggal persetujuan" type="date" path="approved_at" hint={RUBRIC_HELP.approvedAt} value={draft.approvedAt} onChange={(v) => setDraft(setField(draft, "approvedAt", v))} error={errorFor("approved_at")} />
            </div>
          </FormCard>

          <FormCard id={SECTION_PROMPT} title="Prompt penilai">
            <RubricField label="Prompt penilai kualitas" multiline required path="judge_prompt_quality" hint={RUBRIC_HELP.judgePromptQuality} placeholder={RUBRIC_PLACEHOLDER.judgePromptQuality} value={draft.judgePromptQuality} onChange={(v) => setDraft(setField(draft, "judgePromptQuality", v))} error={errorFor("judge_prompt_quality")} />
            <RubricField label="Prompt penilai format" multiline required path="judge_prompt_format" hint={RUBRIC_HELP.judgePromptFormat} placeholder={RUBRIC_PLACEHOLDER.judgePromptFormat} value={draft.judgePromptFormat} onChange={(v) => setDraft(setField(draft, "judgePromptFormat", v))} error={errorFor("judge_prompt_format")} />
          </FormCard>

          <FormCard id={SECTION_SCALE} title="Skala nilai">
            <LevelsEditor levels={draft.levels} errorFor={errorFor} onChange={(score, patch) => setDraft(updateLevel(draft, score, patch))} />
          </FormCard>

          {draft.aspects.map((aspect, index) => (
            <AspectEditor
              key={aspect.id}
              aspect={aspect}
              index={index}
              levels={draft.levels}
              canRemove={draft.aspects.length > 1}
              errorFor={errorFor}
              onChange={(patch) => setDraft(updateAspect(draft, index, patch))}
              onDescriptor={(score, text) => setDraft(setDescriptor(draft, index, score, text))}
              onRemove={() => setDraft(removeAspect(draft, index))}
            />
          ))}
          <Button variant="ghost" onClick={() => setDraft(addAspect(draft))}>
            <Icon name="tambah" size={14} />
            Tambah aspek
          </Button>

          {error && (
            <p role="alert" className="rounded-control border border-danger/30 bg-danger-wash px-4 py-3 text-[13px] text-danger-strong">
              {error}
            </p>
          )}

          {/* Bilah aksi: menempel di bawah layar ponsel (B7), kartu biasa di desktop. */}
          <div className="sticky bottom-0 z-10 -mx-4 flex items-center justify-between gap-3 border-t border-line bg-paper px-4 py-3 sm:static sm:mx-0 sm:rounded-control sm:border sm:px-5">
            {flagged ? (
              <p className="text-[13px] text-danger-strong">{`${problems.length} isian wajib belum diisi.`}</p>
            ) : (
              <p className="hidden items-center gap-1.5 text-[13px] text-muted sm:flex">
                <Icon name="kunci" size={14} />
                Versi rubrik tidak bisa diubah setelah disimpan. Perubahan berikutnya dibuat sebagai versi baru.
              </p>
            )}
            <div className="ml-auto flex shrink-0 gap-2">
              {flagged ? (
                <Button variant="ghost" onClick={focusFirstProblem} className="h-11 sm:h-9">
                  Ke isian pertama
                </Button>
              ) : (
                <Button variant="ghost" onClick={cancel} className="h-11 sm:h-9">
                  Batal
                </Button>
              )}
              <Button type="submit" disabled={pending} className="h-11 sm:h-9">
                Simpan versi
              </Button>
            </div>
          </div>
        </div>
      </div>

      {dialog === "save" && (
        <ConfirmDialog
          title={versionName ? `Simpan ${versionName}?` : "Simpan versi baru?"}
          confirmLabel={versionName ? `Simpan ${versionName}` : "Simpan versi"}
          busyLabel="Menyimpan…"
          dismissLabel="Kembali ke formulir"
          onConfirm={() => submit(draft)}
          errorMessage={noFailure}
          onDone={closeDialog}
          onClose={closeDialog}
        >
          <p className="mt-3 text-sm text-ink">Periksa ringkasan di bawah. Setelah disimpan, versi ini tidak bisa diubah.</p>
          <dl className="mt-3 divide-y divide-line-soft text-sm">
            {saveSummaryRows(draft).map((row) => (
              <div key={row.label} className="flex justify-between gap-4 py-2">
                <dt className="text-muted">{row.label}</dt>
                <dd className="text-right text-ink">
                  {row.values.map((value) => (
                    <span key={value} className="block">
                      {value}
                    </span>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 rounded-control bg-surface px-3 py-2 text-[13px] text-ink-soft">
            Perubahan berikutnya dibuat sebagai versi baru. Hasil penilaian lama tetap memakai versinya.
          </p>
        </ConfirmDialog>
      )}

      {dialog === "template" && (
        <ConfirmDialog
          title="Timpa isian dengan template rubrik v1?"
          confirmLabel="Timpa isian"
          busyLabel="Mengisi…"
          onConfirm={async () => setDraft(createRubricV1Draft())}
          errorMessage={noFailure}
          onDone={closeDialog}
          onClose={closeDialog}
        >
          <p className="mt-3 text-sm text-ink">Isian yang sudah diketik diganti isi template. Tindakan ini tidak bisa dibatalkan.</p>
        </ConfirmDialog>
      )}

      {dialog === "cancel" && (
        <ConfirmDialog
          title="Buang isian versi baru?"
          confirmLabel="Buang isian"
          busyLabel="Membuang…"
          dismissLabel="Lanjut mengisi"
          onConfirm={async () => undefined}
          errorMessage={noFailure}
          onDone={() => {
            closeDialog();
            onCancel();
          }}
          onClose={closeDialog}
        >
          <p className="mt-3 text-sm text-ink">Isian yang sudah diketik akan hilang. Versi rubrik yang sudah ada tidak berubah.</p>
        </ConfirmDialog>
      )}
    </form>
  );
}
