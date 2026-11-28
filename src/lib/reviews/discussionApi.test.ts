import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, BASE_URL } from '@/lib/apiClient';
import { discussionError, getDiscussion, sendReply } from './discussionApi';

const fetchMock = vi.fn<typeof fetch>();
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
afterEach(() => vi.unstubAllGlobals());

describe('discussion API', () => {
  it('encodes the assignment path and includes the session', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ replies: [] })));
    await getDiscussion('a/b');
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/reviews/a%2Fb/discussion`, expect.objectContaining({ credentials: 'include' }));
  });
  it('posts only the reply text and propagates failures', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ id: 'r1' })));
    expect(await sendReply('a/b', { body: 'Please clarify' })).toEqual({ id: 'r1' });
    expect(fetchMock).toHaveBeenCalledWith(`${BASE_URL}/reviews/a%2Fb/replies`, expect.objectContaining({ method: 'POST', body: JSON.stringify({ body: 'Please clarify' }) }));
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(sendReply('a', { body: 'Retry' })).rejects.toThrow('offline');
  });
  it.each([
    [403, 'Anda tidak memiliki izin'], [404, 'Komentar peninjau tidak ditemukan'],
    [409, 'Penugasan telah berubah'], [422, 'Balasan wajib diisi'],
    [500, 'Diskusi gagal'],
  ])('maps HTTP %s without trusting server HTML', (status, expected) => {
    expect(discussionError(new ApiError(status, 'ANY', '<script>'))).toContain(expected);
  });
  it('says the thread is read-only after the case is approved', () => {
    const message = discussionError(new ApiError(409, 'THREAD_READ_ONLY'));
    expect(message).toBe('Kasus sudah disetujui, diskusi ini hanya dapat dibaca.');
  });
  it('keeps the changed-assignment text for other 409 codes', () => {
    expect(discussionError(new ApiError(409, 'ASSIGNMENT_NOT_ACTIVE'))).toContain('Penugasan telah berubah');
  });
  it('handles network and unknown errors', () => {
    expect(discussionError(new Error('offline'))).toContain('Coba lagi');
  });
});

describe('discussionError in English', () => {
  it.each([
    [403, 'ANY', 'You do not have permission to open or reply to this discussion.'],
    [404, 'ANY', 'The reviewer comment was not found or is not available yet.'],
    [409, 'THREAD_READ_ONLY', 'The case is approved, so this discussion is read-only.'],
    [409, 'ASSIGNMENT_NOT_ACTIVE', 'The assignment has changed. Reload the discussion before replying.'],
    [422, 'ANY', 'A reply is required, with a maximum of 5,000 characters.'],
    [500, 'ANY', 'The discussion could not be loaded, or the reply was not sent. Try again.'],
  ] as const)('maps HTTP %s %s without the server message', (status, code, expected) => {
    expect(discussionError(new ApiError(status, code, '<script>'), 'en')).toBe(expected);
  });
});
