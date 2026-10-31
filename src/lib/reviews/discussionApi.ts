import { ApiError, apiFetch } from '@/lib/apiClient';
import type { components } from '@/lib/generated/api';

export type CommentDiscussion = components['schemas']['CommentDiscussion'];
export type CommentReply = components['schemas']['CommentReplyRead'];
export type CommentReplyWrite = components['schemas']['CommentReplyWrite'];

export function getDiscussion(assignmentId: string): Promise<CommentDiscussion> {
  return apiFetch(`/reviews/${encodeURIComponent(assignmentId)}/discussion`);
}

export function sendReply(assignmentId: string, payload: CommentReplyWrite): Promise<CommentReply> {
  return apiFetch(`/reviews/${encodeURIComponent(assignmentId)}/replies`, {
    method: 'POST', body: JSON.stringify(payload),
  });
}

export function discussionError(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 403) return 'Anda tidak memiliki izin untuk membuka atau membalas diskusi ini.';
    if (error.status === 404) return 'Komentar peninjau tidak ditemukan atau belum tersedia.';
    if (error.code === 'THREAD_READ_ONLY') return 'Kasus sudah disetujui, diskusi ini hanya dapat dibaca.';
    if (error.status === 409) return 'Penugasan telah berubah. Muat ulang diskusi sebelum membalas.';
    if (error.status === 422) return 'Balasan wajib diisi, maksimal 5.000 karakter.';
  }
  return 'Diskusi gagal dimuat atau balasan belum berhasil dikirim. Coba lagi.';
}
