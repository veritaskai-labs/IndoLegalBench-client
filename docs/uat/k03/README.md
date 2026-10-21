# K-03 initial workflow evidence

**Historical one-way implementation.** The [22 Oct follow-up](v2/README.md) supersedes the new-tab/read-only reviewer behavior below with a same-page drawer and two-way replies.

22 Oct 2026. Synthetic QA users and an existing test case fixture on an isolated local Next.js/FastAPI/SQLite stack; no production or dev/UAT data modified.

- Author opened the chosen reviewer comment, sent a reply, and verified it survived reload.
- Only the reviewer who owned that comment received a notification; clicking it opened the discussion after the round ended. Reviewer has no reply form.
- Admin audit showed the Author as actor and the Indonesian action label. Audit detail links back to the original discussion, including historical rounds.
- Feedback links open a new tab so editing the case remains mounted; an unsaved test title was preserved when opening a discussion. The title was restored without saving.
- Visual inspection caught inherited low-contrast text; the final discussion uses an explicit foreground color. Screenshots below show the final state.

| Evidence | File |
| --- | --- |
| Saved author reply | [author-reply.png](author-reply.png) |
| Targeted notification | [reviewer-notification.png](reviewer-notification.png) |
| Reviewer read access | [reviewer-discussion.png](reviewer-discussion.png) |
| Attributed audit event | [audit-reply.png](audit-reply.png) |

Local client checks: 1,802 tests / 165 files passed with coverage; lint, typecheck, production build and reproducible API/Zod generation passed. Changed runtime files have 100% statements, branches, functions and lines. This is local flow evidence, not PO acceptance, a deployed UAT retest or a pentest recording.
