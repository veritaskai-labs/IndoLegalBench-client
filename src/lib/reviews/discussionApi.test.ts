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
  it('handles network and unknown errors', () => {
    expect(discussionError(new Error('offline'))).toContain('Coba lagi');
  });
});
