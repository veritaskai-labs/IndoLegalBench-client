'use client';

import Link from 'next/link';
import { useId, useRef, useState, type FormEvent } from 'react';
import { ErrorState } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAsyncResource } from '@/hooks/useAsyncResource';
import { formatWib } from '@/lib/datetime/formatWib';
import { discussionError, getDiscussion, sendReply } from '@/lib/reviews/discussionApi';

function ReplyForm({ assignmentId, onSent }: Readonly<{ assignmentId: string; onSent: () => void }>) {
  const id = useId();
  const [body, setBody] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const sending = useRef(false);
  const valid = body.trim().length > 0 && body.length <= 5000;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || sending.current) return;
    sending.current = true;
    setPending(true);
    setMessage(null);
    try {
      await sendReply(assignmentId, { body: body.trim() });
      onSent();
    } catch (error: unknown) {
      setMessage(discussionError(error));
    } finally {
      sending.current = false;
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <label htmlFor={id} className="block text-sm font-medium">Balasan untuk peninjau</label>
      <textarea id={id} value={body} onChange={(e) => setBody(e.target.value)} rows={4}
        maxLength={5000} required disabled={pending} aria-describedby={`${id}-hint`}
        className="w-full rounded-md border border-slate-300 p-3 text-sm disabled:bg-slate-100" />
      <p id={`${id}-hint`} className="text-xs text-slate-600">Maksimal 5.000 karakter. Balasan tersimpan dalam diskusi dan peninjau akan menerima notifikasi.</p>
      {message !== null && <ErrorState message={message} />}
      <button type="submit" disabled={!valid || pending}
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
        {pending ? 'Mengirim balasan…' : 'Kirim balasan'}
      </button>
    </form>
  );
}

/** A stable notification destination, including after the round leaves the review queue. */
export function CommentDiscussion({ assignmentId }: Readonly<{ assignmentId: string }>) {
  const discussion = useAsyncResource(assignmentId, () => getDiscussion(assignmentId), discussionError);
  if (discussion.status === 'loading') return <LoadingState label="Memuat diskusi…" />;
  if (discussion.status === 'error') return <ErrorState message={discussion.message} onRetry={discussion.reload} />;
  const data = discussion.data;
  return (
    <section aria-label="Diskusi komentar peninjau" className="mx-auto max-w-3xl space-y-5 rounded-lg border border-slate-200 bg-white p-5 text-slate-900">
      <h1 className="text-lg font-semibold">Diskusi komentar peninjau</h1>
      <Link href={data.can_reply ? `/cases/${encodeURIComponent(data.case_id)}/edit` : '/dashboard'} className="text-sm text-indigo-600 underline">{data.can_reply ? 'Lihat kasus' : 'Kembali ke dashboard'}</Link>
      <div className="rounded-md bg-amber-50 p-4">
        <p className="text-sm font-medium">{data.reviewer_name}</p>
        <p className="mt-2 whitespace-pre-wrap break-words text-sm">{data.comment}</p>
      </div>
      <h2 className="text-base font-semibold">Balasan penulis</h2>
      {data.replies.length === 0 ? <p className="text-sm text-slate-600">Belum ada balasan.</p> : (
        <ol className="space-y-3">{data.replies.map((reply) => (
          <li key={reply.id} className="rounded-md border border-slate-200 p-4">
            <p className="text-xs text-slate-500">Penulis · {formatWib(reply.created_at)}</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{reply.body}</p>
          </li>
        ))}</ol>
      )}
      {data.can_reply ? <ReplyForm key={assignmentId} assignmentId={assignmentId} onSent={discussion.reload} /> : (
        <p className="text-sm text-slate-600">Diskusi hanya dapat dibalas oleh penulis kasus pada penugasan yang masih aktif.</p>
      )}
    </section>
  );
}
