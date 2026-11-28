import { ApiError, apiFetch } from '@/lib/apiClient';
import type { components } from '@/lib/generated/api';
import { DEFAULT_LOCALE, messages, text, type Locale } from '@/lib/i18n/locale';

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

const DISCUSSION_ERROR = messages({
  id: {
    forbidden: 'Anda tidak memiliki izin untuk membuka atau membalas diskusi ini.',
    missing: 'Komentar peninjau tidak ditemukan atau belum tersedia.',
    readOnly: 'Kasus sudah disetujui, diskusi ini hanya dapat dibaca.',
    changed: 'Penugasan telah berubah. Muat ulang diskusi sebelum membalas.',
    invalid: 'Balasan wajib diisi, maksimal 5.000 karakter.',
    fallback: 'Diskusi gagal dimuat atau balasan belum berhasil dikirim. Coba lagi.',
  },
  en: {
    forbidden: 'You do not have permission to open or reply to this discussion.',
    missing: 'The reviewer comment was not found or is not available yet.',
    readOnly: 'The case is approved, so this discussion is read-only.',
    changed: 'The assignment has changed. Reload the discussion before replying.',
    invalid: 'A reply is required, with a maximum of 5,000 characters.',
    fallback: 'The discussion could not be loaded, or the reply was not sent. Try again.',
  },
});

export function discussionError(error: unknown, locale: Locale = DEFAULT_LOCALE): string {
  const copy = text(DISCUSSION_ERROR, locale);
  if (error instanceof ApiError) {
    if (error.status === 403) return copy.forbidden;
    if (error.status === 404) return copy.missing;
    if (error.code === 'THREAD_READ_ONLY') return copy.readOnly;
    if (error.status === 409) return copy.changed;
    if (error.status === 422) return copy.invalid;
  }
  return copy.fallback;
}
