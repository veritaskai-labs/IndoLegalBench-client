"use client";

import { useState } from "react";

import { useCreateRubricVersion } from "@/hooks/useCreateRubricVersion";
import { createEmptyDraft, createRubricV1Draft } from "@/lib/rubrics/rubricDraft";
import { addAspect, removeAspect, setDescriptor, setField, updateAspect, updateLevel } from "@/lib/rubrics/rubricDraftEdit";
import { httpRubricsGateway, type RubricsGateway } from "@/lib/rubrics/rubricsApi";
import type { RubricVersion } from "@/types/rubric";
import { AspectEditor } from "./AspectEditor";
import { LevelsEditor } from "./LevelsEditor";
import { RubricField } from "./RubricField";

/**
 * Form membuat versi baru rubrik (PBI-14 AC7). Tidak ada aturan validasi di sini: isian dikirim
 * apa adanya dan server yang menolak (422), pesannya ditaruh di samping field yang disebut server.
 * Perubahan draf lewat fungsi murni di lib/rubrics, dan pengiriman lewat useCreateRubricVersion.
 */
export function RubricVersionForm({
  gateway = httpRubricsGateway,
  onCreated,
}: Readonly<{ gateway?: RubricsGateway; onCreated: (version: RubricVersion) => void }>) {
  const [draft, setDraft] = useState(createEmptyDraft);
  const { submit, pending, error, fieldError } = useCreateRubricVersion((version) => {
    setDraft(createEmptyDraft());
    onCreated(version);
  }, gateway);

  const errorFor = (path: string) => (fieldError?.field === path ? fieldError.message : null);

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit(draft);
      }}
      className="space-y-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-slate-900">Buat versi baru</h2>
        <button
          type="button"
          onClick={() => setDraft(createRubricV1Draft())}
          className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700"
        >
          Isi dari template rubrik v1
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <RubricField label="Berlaku sejak" type="date" value={draft.effectiveDate} onChange={(v) => setDraft(setField(draft, "effectiveDate", v))} error={errorFor("effective_date")} />
        <RubricField label="Nama penyetuju" value={draft.approvedByName} onChange={(v) => setDraft(setField(draft, "approvedByName", v))} error={errorFor("approved_by_name")} />
        <RubricField label="Tanggal persetujuan" type="date" value={draft.approvedAt} onChange={(v) => setDraft(setField(draft, "approvedAt", v))} error={errorFor("approved_at")} />
      </div>

      <RubricField label="Prompt penilai kualitas" multiline value={draft.judgePromptQuality} onChange={(v) => setDraft(setField(draft, "judgePromptQuality", v))} error={errorFor("judge_prompt_quality")} />
      <RubricField label="Prompt penilai format" multiline value={draft.judgePromptFormat} onChange={(v) => setDraft(setField(draft, "judgePromptFormat", v))} error={errorFor("judge_prompt_format")} />

      <LevelsEditor levels={draft.levels} errorFor={errorFor} onChange={(score, patch) => setDraft(updateLevel(draft, score, patch))} />

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
      <button type="button" onClick={() => setDraft(addAspect(draft))} className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-700">
        Tambah aspek
      </button>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
          {pending ? "Menyimpan…" : "Simpan versi baru"}
        </button>
      </div>
    </form>
  );
}
