import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/apiClient';
import { getDiscussion, sendReply, type CommentDiscussion as Discussion } from '@/lib/reviews/discussionApi';
import { CommentDiscussion } from './CommentDiscussion';

vi.mock('@/lib/reviews/discussionApi', async (original) => ({ ...await original<typeof import('@/lib/reviews/discussionApi')>(), getDiscussion: vi.fn(), sendReply: vi.fn() }));
const get = vi.mocked(getDiscussion);
const send = vi.mocked(sendReply);
const reply = { id: 'r1', author_id: 'author', body: '<script>literal text</script>\nSecond line', created_at: '2026-10-22T03:00:00Z' };
const thread = (overrides: Partial<Discussion> = {}): Discussion => ({ assignment_id: 'a1', case_id: 'c1', reviewer_name: 'Reviewer A', comment: 'Mohon perjelas rujukan.', can_reply: true, replies: [], ...overrides });
beforeEach(() => { get.mockReset(); send.mockReset(); get.mockResolvedValue(thread()); });

describe('CommentDiscussion', () => {
  it('loads the exact comment with an accessible empty reply form', async () => {
    render(<CommentDiscussion assignmentId="a1" />);
    expect(screen.getByRole('status')).toHaveTextContent('Memuat diskusi');
    expect(await screen.findByText('Mohon perjelas rujukan.')).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('a1');
    expect(screen.getByRole('link', { name: 'Lihat kasus' })).toHaveAttribute('href', '/cases/c1/edit');
    expect(screen.getByText('Belum ada balasan.')).toBeInTheDocument();
    expect(screen.getByLabelText('Balasan untuk peninjau')).toHaveAccessibleDescription(/5.000/);
    expect(screen.getByRole('button', { name: 'Kirim balasan' })).toBeDisabled();
  });
  it('trims and submits once, then reloads the persisted reply', async () => {
    let resolve!: (value: typeof reply) => void;
    send.mockReturnValue(new Promise((done) => { resolve = done; }));
    const user = userEvent.setup();
    render(<CommentDiscussion assignmentId="a1" />);
    await user.type(await screen.findByLabelText('Balasan untuk peninjau'), '  Tolong perjelas  ');
    await user.click(screen.getByRole('button', { name: 'Kirim balasan' }));
    expect(screen.getByRole('button', { name: 'Mengirim balasan…' })).toBeDisabled();
    const form = screen.getByLabelText('Balasan untuk peninjau').closest('form');
    if (form === null) throw new Error('Missing reply form');
    fireEvent.submit(form);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith('a1', { body: 'Tolong perjelas' });
    get.mockResolvedValue(thread({ replies: [reply] }));
    await act(async () => resolve(reply));
    expect(await screen.findByText(/literal text/)).toHaveTextContent('<script>literal text</script>');
    expect(document.querySelector('script')).toBeNull();
    expect(screen.getByLabelText('Balasan untuk peninjau')).toHaveValue('');
  });
  it('preserves the draft after a failed send and permits retry', async () => {
    send.mockRejectedValueOnce(new ApiError(409, 'ASSIGNMENT_NOT_ACTIVE'));
    send.mockResolvedValueOnce(reply);
    const user = userEvent.setup();
    render(<CommentDiscussion assignmentId="a1" />);
    const input = await screen.findByLabelText('Balasan untuk peninjau');
    await user.type(input, 'Pertanyaan');
    await user.click(screen.getByRole('button', { name: 'Kirim balasan' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Penugasan telah berubah');
    expect(input).toHaveValue('Pertanyaan');
    await user.click(screen.getByRole('button', { name: 'Kirim balasan' }));
    await waitFor(() => expect(send).toHaveBeenCalledTimes(2));
  });
  it('retries failed loading', async () => {
    get.mockRejectedValueOnce(new Error('offline'));
    const user = userEvent.setup();
    render(<CommentDiscussion assignmentId="a1" />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Coba lagi');
    await user.click(screen.getByRole('button', { name: 'Coba lagi' }));
    expect(await screen.findByText('Belum ada balasan.')).toBeInTheDocument();
  });
  it('shows replies without a form when the server denies write access', async () => {
    get.mockResolvedValue(thread({ can_reply: false, replies: [reply] }));
    render(<CommentDiscussion assignmentId="a1" />);
    expect(await screen.findByText(/literal text/)).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });
  it('blocks whitespace and oversized programmatic form submission', async () => {
    render(<CommentDiscussion assignmentId="a1" />);
    const input = await screen.findByLabelText('Balasan untuk peninjau');
    for (const body of ['   ', 'x'.repeat(5001)]) {
      fireEvent.change(input, { target: { value: body } });
      const form = input.closest('form');
      if (form === null) throw new Error('Missing reply form');
      fireEvent.submit(form);
    }
    expect(send).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'x'.repeat(5000) } });
    expect(screen.getByRole('button', { name: 'Kirim balasan' })).toBeEnabled();
  });
  it('discards a stale discussion when navigating to another comment', async () => {
    let resolve!: (value: Discussion) => void;
    get.mockReturnValueOnce(new Promise((done) => { resolve = done; }));
    get.mockResolvedValueOnce(thread({ assignment_id: 'a2', comment: 'Second comment' }));
    const { rerender } = render(<CommentDiscussion assignmentId="a1" />);
    rerender(<CommentDiscussion assignmentId="a2" />);
    expect(await screen.findByText('Second comment')).toBeInTheDocument();
    await act(async () => resolve(thread({ comment: 'Stale first comment' })));
    expect(screen.queryByText('Stale first comment')).not.toBeInTheDocument();
  });
});
