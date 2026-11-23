import type { ImportGateway } from "@/lib/cases/importApi";

/** Tombol unduh template CSV impor kasus (PBI-4 AC6). */
export function TemplateDownloadButton(_props: Readonly<{ gateway: ImportGateway }>) {
  return (
    <button type="button">
      Unduh template CSV
    </button>
  );
}
