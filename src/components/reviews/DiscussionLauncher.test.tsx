import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { getDiscussion, sendReply } from '@/lib/reviews/discussionApi';
import { DiscussionLauncher } from './DiscussionLauncher';
vi.mock('@/lib/reviews/discussionApi', async (original) => ({ ...await original<typeof import('@/lib/reviews/discussionApi')>(), getDiscussion: vi.fn(), sendReply: vi.fn() }));
const reply = {id:'r1', author_id:'author', author_name:'QA Author', author_role:'author' as const, body:'Terima kasih', created_at:'2026-10-22T03:00:00Z'};
beforeEach(() => {
  vi.mocked(getDiscussion).mockResolvedValue({assignment_id:'a1', case_id:'c1', viewer_id:'author', round_no:3, round_status:'decided', reviewer_name:'QA Reviewer', commented_at:'2026-10-22T03:00:00Z', comment:'Perjelas rujukan', can_reply:true, replies:[]});
  vi.mocked(sendReply).mockReset();
});
afterEach(() => { vi.restoreAllMocks(); Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal'); document.body.style.overflow=''; });
it('opens beside the mounted editor, preserves drafts on close, and restores focus and scrolling', async () => {
  const user=userEvent.setup();
  render(<><input aria-label="Judul kasus" defaultValue="Draf kasus" /><DiscussionLauncher assignmentId="a1" /></>);
  const launch=screen.getByRole('button', {name:'Balas komentar'});
  await user.click(launch);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(document.body.style.overflow).toBe('hidden');
  await user.type(await screen.findByLabelText('Balasan Anda'), 'Tolong jelaskan');
  await user.click(screen.getByRole('button', {name:'Tutup diskusi'}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(launch).toHaveFocus();
  expect(document.body.style.overflow).toBe('');
  expect(screen.getByLabelText('Judul kasus')).toHaveValue('Draf kasus');
  await user.click(launch);
  expect(await screen.findByLabelText('Balasan Anda')).toHaveValue('Tolong jelaskan');
});
it('opens a native modal and closes on Escape', async () => {
  const modal=vi.fn(function(this:HTMLDialogElement){this.open=true;});
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {configurable:true, value:modal});
  const user=userEvent.setup();
  render(<DiscussionLauncher assignmentId="a1" label="Buka diskusi komentar" />);
  await user.click(screen.getByRole('button', {name:'Buka diskusi komentar'}));
  expect(modal).toHaveBeenCalledTimes(1);
  fireEvent(screen.getByRole('dialog'), new Event('cancel', {cancelable:true}));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('keeps the modal open while sending, then clears the persisted draft', async () => {
  let resolve!: (value:typeof reply)=>void;
  vi.mocked(sendReply).mockReturnValue(new Promise(done=>{resolve=done;}));
  const user=userEvent.setup();
  render(<DiscussionLauncher assignmentId="a1" />);
  await user.click(screen.getByRole('button', {name:'Balas komentar'}));
  await user.type(await screen.findByLabelText('Balasan Anda'), 'Terima kasih');
  await user.click(screen.getByRole('button', {name:'Kirim balasan'}));
  expect(screen.getByRole('button', {name:'Tutup diskusi'})).toBeDisabled();
  fireEvent(screen.getByRole('dialog'), new Event('cancel', {cancelable:true}));
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  await act(async()=>resolve(reply));
  await waitFor(()=>expect(screen.getByRole('button', {name:'Tutup diskusi'})).toBeEnabled());
  await user.click(screen.getByRole('button', {name:'Tutup diskusi'}));
  await user.click(screen.getByRole('button', {name:'Balas komentar'}));
  expect(await screen.findByLabelText('Balasan Anda')).toHaveValue('');
});

it('cleans up safely when the previously focused control was an SVG element', async () => {
 render(<><svg tabIndex={0} aria-label="Kontrol diagram" data-testid="svg-focus" /><DiscussionLauncher assignmentId="a1" /></>);
 screen.getByTestId('svg-focus').focus();
 expect(document.activeElement).toBe(screen.getByTestId('svg-focus'));
 fireEvent.click(screen.getByRole('button', {name:'Balas komentar'}));
 await screen.findByLabelText('Balasan Anda');
 fireEvent.click(screen.getByRole('button', {name:'Tutup diskusi'}));
 expect(document.body.style.overflow).toBe('');
 expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
