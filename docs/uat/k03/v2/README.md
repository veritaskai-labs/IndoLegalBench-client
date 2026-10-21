# K-03 follow-up: visible two-way discussion

Local QA on 22 October 2026 with synthetic users and a decided third round. These screenshots supersede the initial one-way/read-only reviewer screenshots in the parent directory. They are not PO acceptance or deployed staging evidence.

- Author opens **Balas komentar** beside the exact reviewer comment. The right drawer keeps the case editor mounted.
- Escape/close and reopening retain the unsent reply; an unsaved case title also survived. Sending clears only the reply draft.
- The reviewer opens the targeted notification and answers in the same thread. The Author receives the counterpart notification and sees both named participants.
- Desktop default viewport and 390 × 844 mobile viewport checked; the drawer becomes full width, messages scroll independently and the composer stays visible. Native dialog traps keyboard focus. Physical-device keyboard/safe-area behavior has not been tested.
- Replies remain plain text. Admin is read-only; unrelated reviewers cannot see the conversation. Posting opens only after both verdicts are complete to preserve blind review.
- Reviewers can reach completed-round conversations via their inbox or audit link even after the assignment leaves the review queue. The old assignment route still uses the existing open-queue rule.
- Timestamps on the existing feedback/notification cards in this SQLite QA harness differ from the timezone-normalized discussion; these screenshots do not claim a fix to those existing serializers.
