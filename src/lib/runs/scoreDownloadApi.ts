/**
 * Unduhan skor satu sesi (SCRUM-329). SCRUM-327 belum menerbitkan rutenya di kontrak,
 * jadi pemanggilan bawaan ini tidak menyentuh jaringan dan tidak menyusun CSV dari
 * jawaban, skor, atau alasan yang ada di halaman. Ganti isi download bila rute itu ada.
 */

export type ScoreFile = {
  blob: Blob;
  fileName: string;
};

export type ScoreDownload = {
  download(sessionId: string): Promise<ScoreFile>;
};

/** Hanya id yang aman dipakai sebagai nama berkas. Selain itu, nama tetap. */
const SAFE_SESSION_ID = /^[A-Za-z0-9-]{1,64}$/;

const HEADER = "kasus,produk,skor,jenis_pengukuran,versi_kasus,versi_rubrik,versi_model\n";

export function scoreFileName(sessionId: string): string {
  return SAFE_SESSION_ID.test(sessionId) ? `skor-${sessionId}.csv` : "skor.csv";
}

export const pendingScoreDownload: ScoreDownload = {
  download(sessionId) {
    return Promise.resolve({
      blob: new Blob([HEADER], { type: "text/csv;charset=utf-8" }),
      fileName: scoreFileName(sessionId),
    });
  },
};
