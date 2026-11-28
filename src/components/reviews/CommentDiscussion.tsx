"use client";

import Link from "next/link";
import { useId, useRef, useState, type SubmitEvent } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { LoadingState } from "@/components/ui/LoadingState";
import { useAsyncResource } from "@/hooks/useAsyncResource";
import { formatWib } from "@/lib/datetime/formatWib";
import { fill, messages } from "@/lib/i18n/locale";
import { useLocale, useText } from "@/lib/i18n/LocaleProvider";
import { discussionError, getDiscussion, sendReply, type CommentReply } from "@/lib/reviews/discussionApi";

const COPY = messages({
  id: {
    loading: "Memuat diskusi…",
    region: "Percakapan review",
    title: "Diskusi komentar peninjau",
    back: "Kembali ke dashboard",
    round: "Putaran {round}",
    refresh: "Perbarui diskusi",
    intro: "Percakapan antara penulis dan peninjau terkait. Admin dapat membaca diskusi.",
    initialNote: "Catatan awal peninjau",
    conversation: "Percakapan",
    oneReply: "{count} balasan",
    replyCount: "{count} balasan",
    repliesLabel: "Balasan diskusi",
    noReplies: "Belum ada balasan.",
    start: "Mulai dengan pertanyaan atau tanggapan atas catatan di atas.",
    sent: "Balasan terkirim.",
    opensAfter: "Diskusi dibuka setelah kedua penilaian selesai.",
    onlyParties: "Hanya penulis kasus dan pemilik komentar yang dapat membalas.",
    yourReply: "Balasan Anda",
    limit: " / 5.000",
    placeholder: "Tanyakan bagian yang perlu diperjelas atau tulis tanggapan Anda…",
    hint: "Maksimal 5.000 karakter. Lawan bicara akan menerima notifikasi.",
    sending: "Mengirim balasan…",
    send: "Kirim balasan",
    reviewerRole: "Peninjau",
    authorRole: "Penulis",
    youSuffix: " · Anda",
  },
  en: {
    loading: "Loading discussion…",
    region: "Review conversation",
    title: "Reviewer comment discussion",
    back: "Back to dashboard",
    round: "Round {round}",
    refresh: "Refresh discussion",
    intro: "A conversation between the author and the reviewer involved. Admins can read the discussion.",
    initialNote: "Initial reviewer note",
    conversation: "Conversation",
    oneReply: "{count} reply",
    replyCount: "{count} replies",
    repliesLabel: "Discussion replies",
    noReplies: "No replies yet.",
    start: "Start with a question or a response to the note above.",
    sent: "Reply sent.",
    opensAfter: "The discussion opens after both verdicts are in.",
    onlyParties: "Only the case author and the comment's owner can reply.",
    yourReply: "Your reply",
    limit: " / 5,000",
    placeholder: "Ask about a part that needs clarifying, or write your response…",
    hint: "Maximum 5,000 characters. The other party will be notified.",
    sending: "Sending reply…",
    send: "Send reply",
    reviewerRole: "Reviewer",
    authorRole: "Author",
    youSuffix: " · You",
  },
});

type Copy = (typeof COPY)["id"];

function replyHeading(count: number, copy: Copy): string {
  if (count === 0) return copy.conversation;
  return fill(count === 1 ? copy.oneReply : copy.replyCount, { count });
}

type ComposerProps = { assignmentId: string; body: string; onChange: (body: string) => void; onSent: () => void; onBusyChange?: (busy: boolean) => void };

function ReplyForm({ assignmentId, body, onChange, onSent, onBusyChange }: Readonly<ComposerProps>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const id = useId();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const sending = useRef(false);
  const valid = body.trim().length > 0 && body.length <= 5000;

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || sending.current) return;
    sending.current = true;
    setPending(true);
    onBusyChange?.(true);
    setMessage(null);
    try {
      await sendReply(assignmentId, { body: body.trim() });
      onChange("");
      onSent();
    } catch (error: unknown) {
      setMessage(discussionError(error, locale));
    } finally {
      sending.current = false;
      setPending(false);
      onBusyChange?.(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="flex items-center justify-between gap-3"><label htmlFor={id} className="text-sm font-semibold text-slate-900">{copy.yourReply}</label><span className="text-xs tabular-nums text-slate-400">{body.length.toLocaleString("id-ID")}{copy.limit}</span></div>
      <textarea id={id} value={body} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={copy.placeholder}
        maxLength={5000} required disabled={pending} aria-describedby={`${id}-hint`}
        className="w-full resize-y rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-100 disabled:opacity-60" />
      {message !== null && <ErrorState message={message} />}
      <div className="flex items-center justify-between gap-4"><p id={`${id}-hint`} className="max-w-xs text-xs leading-relaxed text-slate-500">{copy.hint}</p>
        <button type="submit" disabled={!valid || pending} className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-40">
          {pending ? copy.sending : copy.send}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m5 12 14-7-5 14-2-7-7 0Zm7 0 7-7" /></svg>
        </button>
      </div>
    </form>
  );
}

function Message({ reply, mine }: Readonly<{ reply: CommentReply; mine: boolean }>) {
  const copy = useText(COPY);
  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div className="max-w-[92%] space-y-1.5">
        <p className={`text-xs text-slate-500 ${mine ? "text-right" : "text-left"}`}><span className="font-semibold text-slate-700">{reply.author_name}</span> · {reply.author_role === "reviewer" ? copy.reviewerRole : copy.authorRole}{mine && copy.youSuffix}</p>
        <p className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-relaxed ${mine ? "rounded-tr-sm bg-indigo-600 text-white" : "rounded-tl-sm bg-slate-100 text-slate-800"}`}>{reply.body}</p>
        <p className={`text-[11px] text-slate-400 ${mine ? "text-right" : "text-left"}`}>{formatWib(reply.created_at)}</p>
      </div>
    </li>
  );
}

type Props = { assignmentId: string; embedded?: boolean; draft?: string; onDraftChange?: (value: string) => void; onBusyChange?: (busy: boolean) => void; readOnlyNotice?: string | null };

/** Komponen percakapan yang sama dipakai panel dan tautan langsung dari notifikasi. */
export function CommentDiscussion({ assignmentId, embedded = false, draft, onDraftChange, onBusyChange, readOnlyNotice = null }: Readonly<Props>) {
  const copy = useText(COPY);
  const locale = useLocale();
  const [localDraft, setLocalDraft] = useState("");
  const [sent, setSent] = useState(false);
  const body = draft ?? localDraft;
  const changeDraft = onDraftChange ?? setLocalDraft;
  const discussion = useAsyncResource(assignmentId, () => getDiscussion(assignmentId), (error) => discussionError(error, locale));
  const shell = embedded ? "flex min-h-0 flex-1 flex-col" : "mx-auto flex max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm";
  if (discussion.status === "loading") return <div className="p-6"><LoadingState label={copy.loading} /></div>;
  if (discussion.status === "error") return <div className="p-6"><ErrorState message={discussion.message} onRetry={discussion.reload} /></div>;
  const data = discussion.data;
  return (
    <section aria-label={copy.region} className={`${shell} text-slate-900`}>
      <div className="shrink-0 space-y-3 border-b border-slate-200 px-5 py-4">
        {!embedded && <div className="flex items-start justify-between gap-4"><h1 className="text-xl font-semibold">{copy.title}</h1><Link href="/dashboard" className="shrink-0 text-sm font-medium text-indigo-600 hover:underline">{copy.back}</Link></div>}
        <div className="flex flex-wrap items-center justify-between gap-2"><span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">{fill(copy.round, { round: data.round_no })}</span><button type="button" onClick={discussion.reload} className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">{copy.refresh}</button></div>
        <p className="text-xs leading-relaxed text-slate-500">{copy.intro}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-5 py-5">
        <article className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-amber-700">{copy.initialNote}</p>
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-semibold text-slate-900">{data.reviewer_name}</p><span className="text-[11px] text-slate-500">{formatWib(data.commented_at)}</span></div>
          <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-800">{data.comment}</p>
        </article>
        <div className="flex items-center gap-3"><span className="h-px flex-1 bg-slate-200" /><h2 className="text-xs font-semibold text-slate-500">{replyHeading(data.replies.length, copy)}</h2><span className="h-px flex-1 bg-slate-200" /></div>
        {data.replies.length === 0 ? <div className="rounded-xl border border-dashed border-slate-200 px-5 py-6 text-center"><p className="text-sm font-semibold text-slate-700">{copy.noReplies}</p><p className="mt-1 text-xs leading-relaxed text-slate-500">{copy.start}</p></div> : <ol className="space-y-5" aria-label={copy.repliesLabel}>{data.replies.map((reply) => <Message key={reply.id} reply={reply} mine={reply.author_id === data.viewer_id} />)}</ol>}
        {sent && <output className="block text-center text-xs font-medium text-emerald-700">{copy.sent}</output>}
      </div>
      <footer className="shrink-0 border-t border-slate-200 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        {data.can_reply && readOnlyNotice === null ? <ReplyForm assignmentId={assignmentId} body={body} onChange={changeDraft} onBusyChange={onBusyChange} onSent={() => { setSent(true); discussion.reload(); }} /> : <p className="rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-600">{readOnlyNotice ?? (data.round_status !== "decided" ? copy.opensAfter : copy.onlyParties)}</p>}
      </footer>
    </section>
  );
}
