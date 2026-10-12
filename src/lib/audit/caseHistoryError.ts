export type CaseHistoryError = { message: string; canRetry: boolean };

const NOT_ASSIGNED: CaseHistoryError = {
  message: "Anda tidak ditugaskan untuk mereview kasus ini.",
  canRetry: false,
};

const LOAD_FAILED: CaseHistoryError = {
  message: "Gagal memuat riwayat kasus.",
  canRetry: true,
};

export function describeCaseHistoryError(status: number | undefined): CaseHistoryError {
  return status === 403 ? NOT_ASSIGNED : LOAD_FAILED;
}
