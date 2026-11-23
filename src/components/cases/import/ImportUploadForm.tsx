import type { ImportGateway } from "@/lib/cases/importApi";
import type { ImportSummary } from "@/types/caseImport";

/** Form unggah CSV impor kasus (PBI-4 AC4). */
export function ImportUploadForm(
  _props: Readonly<{ gateway: Pick<ImportGateway, "uploadCsv">; onImported: (summary: ImportSummary) => void }>,
) {
  return null;
}
