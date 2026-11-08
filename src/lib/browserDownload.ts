/**
 * Simpan Blob sebagai berkas lewat tautan sementara. Dipisah dari komponen supaya efek ke browser
 * ini punya satu tempat dan bisa diuji sendiri.
 */
export function saveBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  try {
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}
