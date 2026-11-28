import { describe, expect, it } from "vitest";
import { fileOf, filesWith, sourceFiles, violations } from "@/test/sourceFiles";

// A raw Tailwind palette colour or a hex value instead of a globals.css token (ink, paper, accent, danger, ...).
const RAW_COLOUR =
  /(?<![\w-])(?:[a-z-]+:)*(?:text|bg|border|ring|outline|divide|from|via|to|fill|stroke|placeholder|accent|caret|decoration|shadow)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\d{2,3}|\[#[0-9a-fA-F]{3,8}\]/;

// Reported bugs. Delete the entry once its fix lands; the last test fails until you do.
const KNOWN: Record<string, string> = {
  "src/components/layout/SessionExpiry.tsx": "SCRUM-?",
  "src/components/layout/Sidebar.tsx": "SCRUM-?",
  "src/components/ui/Breadcrumb.tsx": "SCRUM-?",
  "src/components/ui/CaseCard.tsx": "SCRUM-?",
  "src/components/ui/CredentialHint.tsx": "SCRUM-?",
  "src/components/ui/LoadingSkeleton.tsx": "SCRUM-?",
  "src/components/ui/MetricCard.tsx": "SCRUM-?",
  "src/components/ui/ProviderCard.tsx": "SCRUM-?",
  "src/components/ui/SecretInput.tsx": "SCRUM-?",
  "src/components/ui/Toast.tsx": "SCRUM-?",
};

const shared = [...sourceFiles("src/components/ui"), ...sourceFiles("src/components/layout")];
const found = violations(shared, (line) => RAW_COLOUR.test(line));

describe("komponen bersama memakai token design system (PBI-25 AC1)", () => {
  it("tidak memakai warna palet Tailwind mentah atau hex", () => {
    expect(found.filter((hit) => !(fileOf(hit) in KNOWN))).toEqual([]);
  });

  it("daftar bug yang diketahui masih akurat", () => {
    expect(filesWith(found)).toEqual(new Set(Object.keys(KNOWN)));
  });
});
