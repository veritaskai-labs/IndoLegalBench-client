// Dibuat oleh scripts/gen-zod.mjs dari contract/openapi.json. Jangan diedit manual.

import { z } from "zod";

export const CaseIdentitySchema = z.object({
  title: z.string().min(1).max(300),
  question: z.string().min(1).max(20000),
  category: z.string().max(120).nullable().optional(),
});

export const LegalRefSchema = z.object({
  regulation_type: z.string().min(1).max(40),
  regulation_number: z.string().min(1).max(40),
  year: z.number().int().min(1).max(9999).nullable().optional(),
  pasal: z.string().min(1).max(40),
  ayat: z.string().max(20).nullable().optional(),
  huruf: z.string().max(8).nullable().optional(),
});

export const AnswerCriteriaSchema = z.object({
  must_contain: z.array(z.string()).optional(),
  must_not_contain: z.array(z.string()).optional(),
  expected_conclusion: z.string().nullable().optional(),
});

export const TrapSchema = z.object({
  description: z.string().min(1).max(2000),
  expected_model_behavior: z.string().max(2000).nullable().optional(),
});

export const SplitTagSchema = z.enum(["dev","test"]);

export const CaseWriteSchema = z.object({
  case_code: z.string().min(2).max(64).regex(new RegExp("^[A-Za-z0-9][A-Za-z0-9._-]{1,63}$")),
  identity: CaseIdentitySchema,
  legal_refs: z.array(LegalRefSchema).min(1),
  answer_criteria: AnswerCriteriaSchema.optional(),
  traps: z.array(TrapSchema).optional(),
  split_tag: SplitTagSchema,
});
